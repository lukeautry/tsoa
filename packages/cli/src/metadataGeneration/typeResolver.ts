import { assertNever, Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { safeFromJson } from '../utils/jsonUtils';
import { getDecorators, getNodeFirstDecoratorValue, isDecorator } from './../utils/decoratorUtils';
import { getJSDocComment, getJSDocComments, getJSDocTagNames, isExistJSDocTag } from './../utils/jsDocUtils';
import { getPropertyValidators } from './../utils/validatorUtils';
import { throwUnless } from '../utils/flowUtils';
import { GenerateMetadataError, GenerateMetaDataWarning } from './exceptions';
import { getExtensions, getExtensionsFromJSDocComments } from './extension';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';

import { PrimitiveTransformer } from './transformer/primitiveTransformer';
import { DateTransformer } from './transformer/dateTransformer';
import { EnumTransformer } from './transformer/enumTransformer';
import { PropertyTransformer } from './transformer/propertyTransformer';
import { ReferenceTransformer } from './transformer/referenceTransformer';
import { TypePresentation, TypePresentationBuilder } from './typePresentation';

type ReferenceState = { kind: 'building'; complete: Array<(type: Tsoa.ReferenceType) => void> } | { kind: 'complete'; type: Tsoa.ReferenceType };
const referenceCaches = new WeakMap<MetadataGenerator, Map<string, ReferenceState>>();
const presentations = new WeakMap<MetadataGenerator, TypePresentationBuilder>();

type UsableDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.PropertySignature | ts.TypeAliasDeclaration | ts.EnumMember;
type UsableDeclarationWithoutPropertySignature = Exclude<UsableDeclaration, ts.PropertySignature>;
type Context = ReadonlyMap<ts.Symbol, Binding>;
type Meaning = { kind: 'bound' } | { kind: 'exact'; type: ts.Type };
type SourceRecipe = { kind: 'source'; node: ts.TypeNode; context: Context; meaning: Meaning };
type Occurrence =
  | SourceRecipe
  | { kind: 'computed'; presentation: TypePresentation; context: Context; recipes: ReadonlyMap<ts.Type, SourceRecipe> }
  | { kind: 'heritage'; node: ts.TypeNode; context: Context; meaning: Meaning; baseNode: ts.ExpressionWithTypeArguments; owner: Meaning; excluded: ReadonlySet<string> };
type Binding = { occurrence: Occurrence; name: string };

export class TypeResolver {
  private readonly typeNode: ts.TypeNode;
  private readonly context: Context;
  private readonly cache: Map<string, ReferenceState>;
  private readonly presentation: TypePresentationBuilder;

  private constructor(
    private readonly occurrence: Occurrence,
    public readonly current: MetadataGenerator,
    private readonly parentNode?: ts.Node,
  ) {
    this.typeNode = occurrence.kind === 'computed' ? occurrence.presentation.node : occurrence.node;
    this.context = occurrence.context;
    let cache = referenceCaches.get(current);
    if (!cache) referenceCaches.set(current, (cache = new Map()));
    this.cache = cache;
    let presentation = presentations.get(current);
    if (!presentation) presentations.set(current, (presentation = new TypePresentationBuilder(current.typeChecker)));
    this.presentation = presentation;
  }

  public static fromSource(node: ts.TypeNode, current: MetadataGenerator, parentNode?: ts.Node): TypeResolver {
    return new TypeResolver({ kind: 'source', node, context: new Map(), meaning: { kind: 'exact', type: current.typeChecker.getTypeFromTypeNode(node) } }, current, parentNode);
  }

  public static fromComputed(type: ts.Type, current: MetadataGenerator, parentNode?: ts.Node): TypeResolver {
    let presentation = presentations.get(current);
    if (!presentation) presentations.set(current, (presentation = new TypePresentationBuilder(current.typeChecker)));
    return new TypeResolver({ kind: 'computed', presentation: presentation.read(type), context: new Map(), recipes: new Map() }, current, parentNode);
  }

  private sourceOccurrence(node: ts.TypeNode, context: Context, meaning?: ts.Type): SourceRecipe {
    const mentionsBinding = (child: ts.Node): boolean => {
      if (ts.isIdentifier(child)) {
        const symbol = this.current.typeChecker.getSymbolAtLocation(child);
        if (symbol && context.has(symbol)) return true;
      }
      return ts.forEachChild(child, mentionsBinding) || false;
    };
    return {
      kind: 'source',
      node,
      context,
      meaning: meaning ? { kind: 'exact', type: meaning } : mentionsBinding(node) ? { kind: 'bound' } : { kind: 'exact', type: this.current.typeChecker.getTypeFromTypeNode(node) },
    };
  }

  private isTupleReference(type: ts.Type): type is ts.TupleTypeReference {
    return (
      Boolean(type.flags & ts.TypeFlags.Object) &&
      'objectFlags' in type &&
      typeof type.objectFlags === 'number' &&
      Boolean(type.objectFlags & ts.ObjectFlags.Reference) &&
      this.current.typeChecker.isTupleType(type)
    );
  }

  private exactType(): ts.Type | undefined {
    return this.occurrence.kind === 'computed' ? this.occurrence.presentation.exact : this.occurrence.meaning.kind === 'exact' ? this.occurrence.meaning.type : undefined;
  }

  private memberOwner(): ts.Type | undefined {
    return this.occurrence.kind === 'heritage' ? (this.occurrence.owner.kind === 'exact' ? this.occurrence.owner.type : undefined) : this.exactType();
  }

  private sourceChild(node: ts.TypeNode, parent = this.parentNode, meaning?: ts.Type): TypeResolver {
    return new TypeResolver(this.sourceOccurrence(node, this.context, meaning), this.current, parent);
  }

  private computedChild(type: ts.Type, parent = this.parentNode, expandAlias = false): TypeResolver {
    const recipes = this.occurrence.kind === 'computed' ? this.occurrence.recipes : new Map<ts.Type, SourceRecipe>();
    const presentation = this.presentation.read(type, expandAlias);
    return this.presentationChild(presentation, recipes, parent);
  }

  private presentationChild(presentation: TypePresentation, recipes: ReadonlyMap<ts.Type, SourceRecipe>, parent = this.parentNode): TypeResolver {
    const recipe = recipes.get(presentation.exact);
    return new TypeResolver(recipe || { kind: 'computed', presentation, context: new Map(), recipes }, this.current, parent);
  }

  private binding(node: ts.EntityName): Binding | undefined {
    const symbol = this.getSymbolAtLocation(node);
    return symbol ? this.context.get(symbol) : undefined;
  }

  public resolveAliasBody(declaration: ts.TypeAliasDeclaration): Tsoa.Type {
    if (this.occurrence.kind === 'heritage') return new TypeResolver({ ...this.occurrence, node: declaration.type }, this.current, declaration).resolve();
    const exact = this.exactType();
    if (this.occurrence.kind !== 'computed') return this.sourceChild(declaration.type, declaration, exact).resolve();
    const presentation = this.presentation.read(this.occurrence.presentation.exact, true);
    if (!declaration.typeParameters?.length || ts.isMappedTypeNode(declaration.type)) {
      return this.sourceChild(declaration.type, declaration, exact).resolve();
    }
    const recipes = new Map<ts.Type, SourceRecipe>();
    const collect = (node: ts.Node): void => {
      if (ts.isTypeNode(node)) {
        const recipe = this.sourceOccurrence(node, this.context);
        if (recipe.meaning.kind === 'exact') {
          recipes.set(recipe.meaning.type, recipe);
          return;
        }
      }
      ts.forEachChild(node, collect);
    };
    collect(declaration.type);
    return this.presentationChild(presentation, recipes, declaration).resolve();
  }

  public includesMember(member: ts.PropertySignature | ts.PropertyDeclaration | ts.ParameterDeclaration): boolean {
    return this.occurrence.kind !== 'heritage' || !this.occurrence.excluded.has(this.getPropertyName(member));
  }

  public resolveMember(member: ts.PropertySignature | ts.PropertyDeclaration | ts.ParameterDeclaration): Tsoa.Type {
    const owner = this.memberOwner();
    const property = owner && this.current.typeChecker.getPropertyOfType(owner, this.getPropertyName(member));
    const exact = property && this.current.typeChecker.getTypeOfSymbol(property);
    if (this.occurrence.kind === 'computed') {
      throwUnless(exact, new GenerateMetadataError('Computed property has no concrete owner.', member));
      return this.computedChild(exact, member).resolve();
    }
    if (member.type) return this.sourceChild(member.type, member, exact).resolve();
    return this.computedChild(exact || this.current.typeChecker.getTypeAtLocation(member), member).resolve();
  }

  public resolve(): Tsoa.Type {
    if (this.occurrence.kind === 'computed') {
      const { presentation, recipes } = this.occurrence;
      const type = presentation.exact;
      if (presentation.kind === 'union' || presentation.kind === 'intersection') {
        return { dataType: presentation.kind, types: presentation.members.map(member => this.presentationChild(member, recipes).resolve()) };
      }
      if (presentation.kind === 'array') return { dataType: 'array', elementType: this.presentationChild(presentation.element, recipes).resolve() };
      if (presentation.kind === 'leaf' && this.isTupleReference(type)) {
        const elements = this.current.typeChecker.getTypeArguments(type);
        const types: Tsoa.Type[] = [];
        let restType: Tsoa.Type | undefined;
        for (let index = 0; index < elements.length; index++) {
          const child = this.computedChild(elements[index]).resolve();
          if (type.target.elementFlags[index] & (ts.ElementFlags.Rest | ts.ElementFlags.Variadic)) restType = child.dataType === 'array' ? child.elementType : child;
          else types.push(child);
        }
        return { dataType: 'tuple', types, ...(restType ? { restType } : {}) };
      }
    }
    const partentJsDocTagNames = this.parentNode ? getJSDocTagNames(this.parentNode) : undefined;
    const primitiveType = new PrimitiveTransformer().transform(this.current.defaultNumberType, this.typeNode, partentJsDocTagNames);
    if (primitiveType) {
      return primitiveType;
    }

    if (ts.isArrayTypeNode(this.typeNode)) {
      const arrayMetaType: Tsoa.ArrayType = {
        dataType: 'array',
        elementType: this.sourceChild(this.typeNode.elementType, this.parentNode, this.exactType()?.getNumberIndexType()).resolve(),
      };
      return arrayMetaType;
    }

    if (ts.isRestTypeNode(this.typeNode)) {
      return this.sourceChild(this.typeNode.type).resolve();
    }

    if (ts.isUnionTypeNode(this.typeNode)) {
      const types = this.typeNode.types.map(type => this.sourceChild(type).resolve());

      const unionMetaType: Tsoa.UnionType = {
        dataType: 'union',
        types,
      };
      return unionMetaType;
    }

    if (ts.isIntersectionTypeNode(this.typeNode)) {
      const types = this.typeNode.types.map(type => {
        return this.sourceChild(type).resolve();
      });

      const intersectionMetaType: Tsoa.IntersectionType = {
        dataType: 'intersection',
        types,
      };

      return intersectionMetaType;
    }

    if (ts.isTupleTypeNode(this.typeNode)) {
      const elementTypes: Tsoa.Type[] = [];
      let restType: Tsoa.Type | undefined;

      for (const element of this.typeNode.elements) {
        if (ts.isRestTypeNode(element)) {
          const resolvedRest = this.sourceChild(element.type, element).resolve();

          if (resolvedRest.dataType === 'array') {
            restType = resolvedRest.elementType;
          } else {
            restType = resolvedRest;
          }
        } else {
          const typeNode = ts.isNamedTupleMember(element) ? element.type : element;
          const type = this.sourceChild(typeNode, element).resolve();
          elementTypes.push(type);
        }
      }

      return {
        dataType: 'tuple',
        types: elementTypes,
        ...(restType ? { restType } : {}),
      };
    }

    if (this.typeNode.kind === ts.SyntaxKind.AnyKeyword || this.typeNode.kind === ts.SyntaxKind.UnknownKeyword) {
      const literallyAny: Tsoa.AnyType = {
        dataType: 'any',
      };
      return literallyAny;
    }

    if (ts.isLiteralTypeNode(this.typeNode)) {
      const enumType: Tsoa.EnumType = {
        dataType: 'enum',
        enums: [this.getLiteralValue(this.typeNode)],
      };
      return enumType;
    }

    if (ts.isTypeLiteralNode(this.typeNode)) {
      const properties = this.typeNode.members.filter(ts.isPropertySignature).reduce<Tsoa.Property[]>((res, propertySignature: ts.PropertySignature) => {
        const type = this.resolveMember(propertySignature);

        const def = TypeResolver.getDefault(propertySignature);
        const property: Tsoa.Property = {
          example: this.getNodeExample(propertySignature),
          default: def,
          description: this.getNodeDescription(propertySignature),
          format: this.getNodeFormat(propertySignature),
          name: this.getPropertyName(propertySignature),
          required: !propertySignature.questionToken,
          type,
          validators: getPropertyValidators(propertySignature) || {},
          deprecated: isExistJSDocTag(propertySignature, tag => tag.tagName.text === 'deprecated'),
          title: this.getNodeTitle(propertySignature),
          extensions: this.getNodeExtension(propertySignature),
        };

        return [property, ...res];
      }, []);

      const indexMember = this.typeNode.members.find(ts.isIndexSignatureDeclaration);
      const additionalType = indexMember && this.resolveIndex(indexMember);

      const objLiteral: Tsoa.NestedObjectLiteralType = {
        additionalProperties: indexMember && additionalType,
        dataType: 'nestedObjectLiteral',
        properties,
      };
      return objLiteral;
    }

    if (this.typeNode.kind === ts.SyntaxKind.ObjectKeyword) {
      return { dataType: 'object' };
    }

    if (ts.isMappedTypeNode(this.typeNode)) {
      const mappedTypeNode = this.typeNode;
      const getOneOrigDeclaration = (prop: ts.Symbol): ts.Declaration | undefined => {
        if (prop.declarations) {
          return prop.declarations[0];
        }
        const syntheticOrigin: ts.Symbol = (prop as any).links?.syntheticOrigin;
        if (syntheticOrigin && syntheticOrigin.name === prop.name) {
          //Otherwise losts jsDoc like in intellisense
          return syntheticOrigin.declarations?.[0];
        }
        return undefined;
      };
      const isIgnored = (prop: ts.Symbol) => {
        const declaration = getOneOrigDeclaration(prop);
        return (
          declaration !== undefined &&
          (getJSDocTagNames(declaration).some(tag => tag === 'ignore') || (!ts.isPropertyDeclaration(declaration) && !ts.isPropertySignature(declaration) && !ts.isParameter(declaration)))
        );
      };

      const calcMappedType = (type: ts.Type): Tsoa.Type => {
        if (type.isUnionOrIntersection()) {
          return { dataType: type.isUnion() ? 'union' : 'intersection', types: type.types.map(calcMappedType) };
        } else if (this.hasFlag(type, ts.TypeFlags.Undefined)) {
          return {
            dataType: 'undefined',
          };
        } else if (this.hasFlag(type, ts.TypeFlags.Null)) {
          return {
            dataType: 'enum',
            enums: [null],
          };
        } else if (this.hasFlag(type, ts.TypeFlags.Object)) {
          const typeProperties: ts.Symbol[] = type.getProperties();
          const properties: Tsoa.Property[] = typeProperties
            .filter(property => this.occurrence.kind !== 'heritage' || !this.occurrence.excluded.has(property.getName()))
            // Ignore methods, getter, setter and @ignored props
            .filter(property => isIgnored(property) === false)
            // Transform to property
            .map(property => {
              const owner = this.memberOwner();
              const member =
                this.occurrence.kind === 'heritage' && this.occurrence.meaning.kind === 'bound' ? owner && this.current.typeChecker.getPropertyOfType(owner, property.getName()) : property;
              const required = !this.hasFlag(property, ts.SymbolFlags.Optional);
              const valueNode =
                !member &&
                !required &&
                this.occurrence.kind === 'heritage' &&
                ts.isHeritageClause(this.occurrence.baseNode.parent) &&
                this.occurrence.baseNode.parent.token === ts.SyntaxKind.ImplementsKeyword
                  ? mappedTypeNode.type
                  : undefined;
              throwUnless(member || valueNode, new GenerateMetadataError('Inherited mapped property has no concrete owner or captured value.', this.typeNode));
              const propertyType = this.current.typeChecker.getTypeOfSymbol(member || property);

              const parent = getOneOrigDeclaration(property); //If there are more declarations, we need to get one of them, from where we want to recognize jsDoc
              const value = valueNode && this.sourceChild(valueNode, parent).resolve();
              const type: Tsoa.Type = value
                ? propertyType.isUnion() && propertyType.types.some(type => type.flags & ts.TypeFlags.Undefined)
                  ? { dataType: 'union', types: [value, { dataType: 'undefined' }] }
                  : value
                : this.computedChild(propertyType, parent).resolve();

              const comments = property.getDocumentationComment(this.current.typeChecker);
              const description = comments.length ? ts.displayPartsToString(comments) : undefined;

              const initializer = (parent as any)?.initializer;
              const def = initializer ? getInitializerValue(initializer, this.current.typeChecker) : parent ? TypeResolver.getDefault(parent) : undefined;

              // Push property
              return {
                name: property.getName(),
                required,
                deprecated: parent ? isExistJSDocTag(parent, tag => tag.tagName.text === 'deprecated') || isDecorator(parent, identifier => identifier.text === 'Deprecated') : false,
                type,
                default: def,
                // validators are disjunct via types, so it is now OK.
                // if a type not changes while mapping, we need validators
                // if a type changes, then the validators will be not relevant
                validators: (parent ? getPropertyValidators(parent) : {}) || {},
                description,
                format: parent ? this.getNodeFormat(parent) : undefined,
                example: parent ? this.getNodeExample(parent) : undefined,
                extensions: parent ? this.getNodeExtension(parent) : undefined,
              };
            });

          const objectLiteral: Tsoa.NestedObjectLiteralType = {
            dataType: 'nestedObjectLiteral',
            properties,
          };
          const indexInfos = this.current.typeChecker.getIndexInfosOfType(type);
          const indexTypes = indexInfos.flatMap(indexInfo => {
            if (indexInfo.type.flags & ts.TypeFlags.Never) {
              // { [k: string]: never; }
              return [];
            }
            const type = this.computedChild(indexInfo.type, mappedTypeNode).resolve();
            return [type];
          });
          if (indexTypes.length) {
            if (indexTypes.length === 1) {
              objectLiteral.additionalProperties = indexTypes[0];
            } else {
              // { [k: string]: string; } & { [k: number]: number; }

              // A | B is sometimes A type or B type, sometimes optionally accepts both A & B members.
              // Most people & TSOA thinks that A | B can be only A or only B.
              // So we can accept this merge

              //Every additional property key assumed as string
              objectLiteral.additionalProperties = {
                dataType: 'union',
                types: indexTypes,
              };
            }
          }
          return objectLiteral;
        }
        // Known issues & easy to implement: Partial<string>, Partial<never>, ... But I think a programmer not writes types like this
        throw new GenerateMetadataError(`Unhandled mapped type has found, flags: ${type.flags}`, this.typeNode);
      };

      return calcMappedType(this.occurrence.kind === 'heritage' ? this.current.typeChecker.getTypeAtLocation(this.occurrence.baseNode) : this.requiredType());
    }

    if (ts.isConditionalTypeNode(this.typeNode)) {
      return this.computedChild(this.requiredType(), this.typeNode, true).resolve();
    }

    // keyof & readonly arrays
    if (ts.isTypeOperatorNode(this.typeNode)) {
      return this.resolveTypeOperatorNode(this.typeNode, this.current.typeChecker, this.current, this.context, this.parentNode);
    }

    // Indexed type
    if (ts.isIndexedAccessTypeNode(this.typeNode)) {
      return this.resolveIndexedAccessTypeNode(this.typeNode, this.current.typeChecker, this.current);
    }

    if (ts.isTemplateLiteralTypeNode(this.typeNode)) {
      const type = this.requiredType();
      throwUnless(
        type.isUnion() && type.types.every((unionElementType): unionElementType is ts.StringLiteralType => unionElementType.isStringLiteral()),
        new GenerateMetadataError(`Could not the type of ${this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode), this.typeNode)}`, this.typeNode),
      );

      // `a${'c' | 'd'}b`
      const stringLiteralEnum: Tsoa.EnumType = {
        dataType: 'enum',
        enums: type.types.map((stringLiteralType: ts.StringLiteralType) => stringLiteralType.value),
      };
      return stringLiteralEnum;
    }

    if (ts.isParenthesizedTypeNode(this.typeNode)) {
      return this.sourceChild(this.typeNode.type, this.typeNode, this.exactType()).resolve();
    }

    if (ts.isImportTypeNode(this.typeNode) && this.typeNode.qualifier && !this.typeNode.isTypeOf) {
      return this.resolveTypeReferenceNode(ts.factory.createTypeReferenceNode(this.typeNode.qualifier, this.typeNode.typeArguments), this.current, this.parentNode);
    }

    throwUnless(this.typeNode.kind === ts.SyntaxKind.TypeReference, new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[this.typeNode.kind]}`, this.typeNode));

    return this.resolveTypeReferenceNode(this.typeNode as ts.TypeReferenceNode, this.current, this.parentNode);
  }

  private resolveTypeOperatorNode(typeNode: ts.TypeOperatorNode, typeChecker: ts.TypeChecker, current: MetadataGenerator, context: Context, parentNode?: ts.Node): Tsoa.Type {
    switch (typeNode.operator) {
      case ts.SyntaxKind.KeyOfKeyword: {
        // keyof
        const type = typeChecker.getTypeFromTypeNode(typeNode);
        if (type.isIndexType()) {
          // in case of generic: keyof T. Not handles all possible cases
          const symbol = type.type.getSymbol();
          if (symbol && this.hasFlag(symbol, ts.SymbolFlags.TypeParameter)) {
            const typeName = symbol.getEscapedName();
            throwUnless(typeof typeName === 'string', new GenerateMetadataError(`typeName is not string, but ${typeof typeName}`, typeNode));

            const binding = context.get(symbol);
            if (binding) {
              const subResult = new TypeResolver(binding.occurrence, current, parentNode).resolve();
              if (subResult.dataType === 'any') {
                return {
                  dataType: 'union',
                  types: [{ dataType: 'string' }, { dataType: 'double' }],
                };
              }
              const properties = (subResult as Tsoa.RefObjectType).properties?.map(v => v.name);
              throwUnless(properties, new GenerateMetadataError(`TypeOperator 'keyof' on node which have no properties`, this.typeNode));

              return {
                dataType: 'enum',
                enums: properties,
              };
            }
          }
        } else if (type.isUnion()) {
          const literals = type.types.filter((t): t is ts.LiteralType => t.isLiteral());
          const literalValues: Array<string | number> = [];
          for (const literal of literals) {
            throwUnless(
              typeof literal.value == 'number' || typeof literal.value == 'string',
              new GenerateMetadataError(`Not handled key Type, maybe ts.PseudoBigInt ${typeChecker.typeToString(literal)}`, typeNode),
            );
            literalValues.push(literal.value);
          }

          if (!literals.length) {
            const length = type.types.length;
            const someStringFlag = type.types.some(t => t.flags === ts.TypeFlags.String);
            const someNumberFlag = type.types.some(t => t.flags === ts.TypeFlags.Number);
            const someSymbolFlag = type.types.some(t => t.flags === ts.TypeFlags.ESSymbol);

            if (someStringFlag && someNumberFlag) {
              if (length === 2 || (length === 3 && someSymbolFlag)) {
                return {
                  dataType: 'union',
                  types: [{ dataType: 'string' }, { dataType: 'double' }],
                };
              }
            }
          }

          // Warn on nonsense (`number`, `typeof Symbol.iterator`)
          if (type.types.find(t => !t.isLiteral()) !== undefined) {
            const problems = type.types.filter(t => !t.isLiteral()).map(t => typeChecker.typeToString(t));
            console.warn(new GenerateMetaDataWarning(`Skipped non-literal type(s) ${problems.join(', ')}`, typeNode).toString());
          }

          const stringMembers = literalValues.filter(v => typeof v == 'string');
          const numberMembers = literalValues.filter(v => typeof v == 'number');
          if (stringMembers.length && numberMembers.length) {
            return {
              dataType: 'union',
              types: [
                { dataType: 'enum', enums: stringMembers },
                { dataType: 'enum', enums: numberMembers },
              ],
            };
          }
          return {
            dataType: 'enum',
            enums: literalValues,
          };
        } else if (type.isLiteral()) {
          throwUnless(
            typeof type.value == 'number' || typeof type.value == 'string',
            new GenerateMetadataError(`Not handled indexType, maybe ts.PseudoBigInt ${typeChecker.typeToString(type)}`, typeNode),
          );

          return {
            dataType: 'enum',
            enums: [type.value],
          };
        } else if (this.hasFlag(type, ts.TypeFlags.Never)) {
          throw new GenerateMetadataError(`TypeOperator 'keyof' on node produced a never type`, typeNode);
        } else if (this.hasFlag(type, ts.TypeFlags.TemplateLiteral)) {
          //Now assumes template literals as string
          console.warn(new GenerateMetaDataWarning(`Template literals are assumed as strings`, typeNode).toString());
          return {
            dataType: 'string',
          };
        } else if (this.hasFlag(type, ts.TypeFlags.Number)) {
          return {
            dataType: 'double',
          };
        }
        const indexedTypeName = typeChecker.typeToString(typeChecker.getTypeFromTypeNode(typeNode.type));
        throw new GenerateMetadataError(`Could not determine the keys on ${indexedTypeName}`, typeNode);
      }
      case ts.SyntaxKind.ReadonlyKeyword:
        // Handle `readonly` arrays
        return this.sourceChild(typeNode.type, typeNode, this.exactType()).resolve();
      default:
        throw new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`, typeNode);
    }
  }

  private resolveIndexedAccessTypeNode(typeNode: ts.IndexedAccessTypeNode, typeChecker: ts.TypeChecker, current: MetadataGenerator): Tsoa.Type {
    const { indexType, objectType } = typeNode;
    let object = this.sourceChild(objectType);
    if (ts.isTypeReferenceNode(objectType)) {
      const bound = object.binding(objectType.typeName);
      if (bound) object = new TypeResolver(bound.occurrence, current, this.parentNode);
    }
    const owner = object.exactType();
    if (ts.isLiteralTypeNode(indexType) && (ts.isStringLiteral(indexType.literal) || ts.isNumericLiteral(indexType.literal))) {
      const declarationOwner = object.occurrence.kind === 'source' ? typeChecker.getTypeFromTypeNode(object.occurrence.node) : undefined;
      const propertyOwner = owner || declarationOwner;
      const property = propertyOwner && typeChecker.getPropertyOfType(propertyOwner, indexType.literal.text);
      const exact = owner && property ? typeChecker.getTypeOfSymbol(property) : this.exactType();
      const declaration = property?.valueDeclaration;
      if (declaration && (ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration)) && declaration.type && object.occurrence.kind !== 'computed') {
        const scope = ts.isTypeReferenceNode(object.typeNode) ? object.typeArgumentsToContext(object.typeNode, object.typeNode.typeName) : object.context;
        return new TypeResolver(this.sourceOccurrence(declaration.type, scope, exact), current, typeNode).resolve();
      }
      if (exact) return this.computedChild(exact, typeNode).resolve();
    }
    if (owner && (indexType.kind === ts.SyntaxKind.NumberKeyword || indexType.kind === ts.SyntaxKind.StringKeyword)) {
      const index = indexType.kind === ts.SyntaxKind.NumberKeyword ? ts.IndexKind.Number : ts.IndexKind.String;
      const exact = typeChecker.getIndexTypeOfType(owner, index);
      throwUnless(exact, new GenerateMetadataError('Indexed owner has no matching index type.', typeNode));
      return this.computedChild(exact, typeNode).resolve();
    }
    const exact = this.exactType();
    throwUnless(exact, new GenerateMetadataError('Indexed expression has no concrete compiler owner.', typeNode));
    return this.computedChild(exact, typeNode, true).resolve();
  }

  private resolveTypeReferenceNode(typeNode: ts.TypeReferenceNode, current: MetadataGenerator, parentNode?: ts.Node): Tsoa.Type {
    const { typeName, typeArguments } = typeNode;

    if (typeName.kind !== ts.SyntaxKind.Identifier) {
      return this.getReferenceType(typeNode);
    }

    switch (typeName.text) {
      case 'Date':
        return new DateTransformer().transform(parentNode);
      case 'Buffer':
      case 'Readable':
        return { dataType: 'buffer' };
      case 'Array':
        if (typeArguments && typeArguments.length === 1) {
          return {
            dataType: 'array',
            elementType: this.argumentChild(typeArguments[0], 0, parentNode).resolve(),
          };
        }
        break;
      case 'Promise':
        if (typeArguments && typeArguments.length === 1) {
          return this.argumentChild(typeArguments[0], 0, parentNode).resolve();
        }
        break;
      case 'String':
        return { dataType: 'string' };
      default: {
        const binding = this.binding(typeName);
        if (binding) {
          const use = binding.occurrence;
          const exact = this.exactType();
          const occurrence: Occurrence = use.kind === 'source' && exact ? { ...use, meaning: { kind: 'exact', type: exact } } : use;
          return new TypeResolver(occurrence, current, parentNode).resolve();
        }
      }
    }

    return this.getReferenceType(typeNode);
  }

  private getLiteralValue(typeNode: ts.LiteralTypeNode): string | number | boolean | null {
    switch (typeNode.literal.kind) {
      case ts.SyntaxKind.TrueKeyword:
        return true;
      case ts.SyntaxKind.FalseKeyword:
        return false;
      case ts.SyntaxKind.StringLiteral:
        return typeNode.literal.text;
      case ts.SyntaxKind.NumericLiteral:
        return parseFloat(typeNode.literal.text);
      case ts.SyntaxKind.PrefixUnaryExpression:
        // make sure to only handle the MinusToken here
        throwUnless((typeNode.literal as ts.PrefixUnaryExpression).operator === ts.SyntaxKind.MinusToken, new GenerateMetadataError(`Couldn't resolve literal node: ${typeNode.literal.getText()}`));
        return parseFloat(typeNode.literal.getText());
      case ts.SyntaxKind.NullKeyword:
        return null;
      default:
        throwUnless(Object.prototype.hasOwnProperty.call(typeNode.literal, 'text'), new GenerateMetadataError(`Couldn't resolve literal node: ${typeNode.literal.getText()}`));
        return typeNode.literal.text;
    }
  }

  private getDesignatedModels<T extends ts.Node>(nodes: T[], typeName: string): T[] {
    /**
     * Model is marked with '@tsoaModel', indicating that it should be the 'canonical' model used
     */
    const designatedNodes = nodes.filter(enumNode => {
      return isExistJSDocTag(enumNode, tag => tag.tagName.text === 'tsoaModel');
    });
    if (designatedNodes.length === 0) {
      return nodes;
    }

    throwUnless(designatedNodes.length === 1, new GenerateMetadataError(`Multiple models for ${typeName} marked with '@tsoaModel'; '@tsoaModel' should only be applied to one model.`));

    return designatedNodes;
  }

  private hasFlag(type: ts.Type | ts.Symbol | ts.Declaration, flag: ts.TypeFlags | ts.NodeFlags | ts.SymbolFlags) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    return (type.flags & flag) === flag;
  }

  private requiredType(): ts.Type {
    const type = this.exactType();
    throwUnless(type, new GenerateMetadataError('Bound expression has no compiler ownership path.', this.typeNode));
    return type;
  }

  private static typeReferenceToEntityName(node: ts.TypeReferenceType): ts.EntityName {
    if (ts.isTypeReferenceNode(node)) {
      return node.typeName;
    } else if (ts.isExpressionWithTypeArguments(node)) {
      return node.expression as ts.EntityName;
    }
    throw new GenerateMetadataError(`Can't resolve Reference type.`);
  }

  //Generates type name for type references
  private calcRefTypeName(type: ts.EntityName): string {
    const getEntityName = (type: ts.EntityName): string => {
      if (ts.isIdentifier(type)) {
        return type.text;
      }
      return `${getEntityName(type.left)}.${type.right.text}`;
    };

    let name = getEntityName(type);
    const binding = this.binding(type);
    if (binding) {
      name = binding.name;
    } else {
      const declarations = this.getModelTypeDeclarations(type);

      if (!declarations.length) return name;

      //Two possible solutions for recognizing different types:
      // - Add declaration positions into type names (In an order).
      //    - It accepts multiple types with same name, if the code compiles, there would be no conflicts in the type names
      //    - Clear namespaces from type names.
      //    - Horrible changes can be in the routes.ts in case of teamwork,
      //        because source files have paths in the computer where data generation runs.
      // - Use fully namespaced names
      //    - Conflicts can be recognized because of the declarations
      //
      // The second was implemented, it not changes the usual type name formats.

      const oneDeclaration = declarations[0]; //Every declarations should be in the same namespace hierarchy
      const identifiers = name.split('.');
      if (oneDeclaration && ts.isEnumMember(oneDeclaration)) {
        name = identifiers.slice(identifiers.length - 2).join('.');
      } else {
        name = identifiers.slice(identifiers.length - 1).join('.');
      }

      let actNode = oneDeclaration.parent;
      let isFirst = true;
      const isGlobalDeclaration = (mod: ts.ModuleDeclaration) => mod.name.kind === ts.SyntaxKind.Identifier && mod.name.text === 'global';

      while (!ts.isSourceFile(actNode)) {
        if (ts.isBlock(actNode)) {
          break;
        }
        if (!(isFirst && ts.isEnumDeclaration(actNode)) && !ts.isModuleBlock(actNode)) {
          throwUnless(ts.isModuleDeclaration(actNode), new GenerateMetadataError(`This node kind is unknown: ${actNode.kind}`, type));

          if (!isGlobalDeclaration(actNode)) {
            const moduleName = actNode.name.text;
            name = `${moduleName}.${name}`;
          }
        }
        isFirst = false;
        actNode = actNode.parent;
      }

      const declarationPositions = declarations.map(declaration => ({
        fileName: declaration.getSourceFile().fileName,
        pos: declaration.pos,
      }));
      this.current.CheckModelUnicity(name, declarationPositions);
    }
    return name;
  }

  private calcMemberJsDocProperties(arg: ts.PropertySignature): string {
    const def = TypeResolver.getDefault(arg);
    const isDeprecated = isExistJSDocTag(arg, tag => tag.tagName.text === 'deprecated') || isDecorator(arg, identifier => identifier.text === 'Deprecated');

    const symbol = this.getSymbolAtLocation(arg.name);
    const comments = symbol ? symbol.getDocumentationComment(this.current.typeChecker) : [];
    const description = comments.length ? ts.displayPartsToString(comments) : undefined;

    const validators = getPropertyValidators(arg);
    const format = this.getNodeFormat(arg);
    const example = this.getNodeExample(arg);
    const extensions = this.getNodeExtension(arg);
    const isIgnored = getJSDocTagNames(arg).some(tag => tag === 'ignore');

    const jsonObj = {
      default: def,
      description,
      validators: validators && Object.keys(validators).length ? validators : undefined,
      format,
      example: example !== undefined ? example : undefined,
      extensions: extensions.length ? extensions : undefined,
      deprecated: isDeprecated ? true : undefined,
      ignored: isIgnored ? true : undefined,
    };
    const keys: Array<keyof typeof jsonObj> = Object.keys(jsonObj) as any;
    for (const key of keys) {
      if (jsonObj[key] === undefined) {
        delete jsonObj[key];
      }
    }
    if (Object.keys(jsonObj).length) {
      return JSON.stringify(jsonObj);
    }
    return '';
  }

  //Generates type name for type references
  private calcTypeName(arg: ts.TypeNode): string {
    if (ts.isLiteralTypeNode(arg)) {
      const literalValue = this.getLiteralValue(arg);
      if (typeof literalValue == 'string') {
        return `'${literalValue}'`;
      }
      if (literalValue === null) {
        return 'null';
      }
      if (typeof literalValue === 'boolean') {
        return literalValue === true ? 'true' : 'false';
      }
      return `${literalValue}`;
    }
    const resolvedType = PrimitiveTransformer.resolveKindToPrimitive(arg.kind);
    if (resolvedType) {
      return resolvedType;
    }
    if (ts.isImportTypeNode(arg) && arg.qualifier && !arg.isTypeOf) {
      return this.calcTypeReferenceTypeName(ts.factory.createTypeReferenceNode(arg.qualifier, arg.typeArguments))[1];
    }
    if (ts.isTypeReferenceNode(arg) || ts.isExpressionWithTypeArguments(arg)) {
      return this.calcTypeReferenceTypeName(arg)[1];
    } else if (ts.isTypeLiteralNode(arg)) {
      const members = arg.members.map(member => {
        if (ts.isPropertySignature(member)) {
          const name = (member.name as ts.Identifier).text;
          const typeText = this.calcTypeName(member.type as ts.TypeNode);
          return `"${name}"${member.questionToken ? '?' : ''}${this.calcMemberJsDocProperties(member)}: ${typeText}`;
        } else if (ts.isIndexSignatureDeclaration(member)) {
          throwUnless(member.parameters.length === 1, new GenerateMetadataError(`Index signature parameters length != 1`, member));

          const indexType = member.parameters[0];
          throwUnless(
            // now we can't reach this part of code
            ts.isParameter(indexType),
            new GenerateMetadataError(`indexSignature declaration parameter kind is not SyntaxKind.Parameter`, indexType),
          );
          throwUnless(!indexType.questionToken, new GenerateMetadataError(`Question token has found for an indexSignature declaration`, indexType));

          const typeText = this.calcTypeName(member.type);
          const indexName = (indexType.name as ts.Identifier).text;
          const indexTypeText = this.calcTypeName(indexType.type as ts.TypeNode);
          return `["${indexName}": ${indexTypeText}]: ${typeText}`;
        }
        throw new GenerateMetadataError(`Unhandled member kind has found: ${member.kind}`, member);
      });
      return `{${members.join('; ')}}`;
    } else if (ts.isArrayTypeNode(arg)) {
      const typeName = this.calcTypeName(arg.elementType);
      return `${typeName}[]`;
    } else if (ts.isIntersectionTypeNode(arg)) {
      const memberTypeNames = arg.types.map(type => this.calcTypeName(type));
      return memberTypeNames.join(' & ');
    } else if (ts.isUnionTypeNode(arg)) {
      const memberTypeNames = arg.types.map(type => this.calcTypeName(type));
      return memberTypeNames.join(' | ');
    } else if (ts.isTypeOperatorNode(arg)) {
      const subTypeName = this.calcTypeName(arg.type);
      if (arg.operator === ts.SyntaxKind.KeyOfKeyword) {
        return `keyof ${subTypeName}`;
      } else if (arg.operator === ts.SyntaxKind.ReadonlyKeyword) {
        return `readonly ${subTypeName}`;
      }
      throw new GenerateMetadataError(`Unknown keyword has found: ${arg.operator}`, arg);
    } else if (ts.isTypeQueryNode(arg)) {
      const subTypeName = this.calcRefTypeName(arg.exprName);
      return `typeof ${subTypeName}`;
    } else if (ts.isIndexedAccessTypeNode(arg)) {
      const objectTypeName = this.calcTypeName(arg.objectType);
      const indexTypeName = this.calcTypeName(arg.indexType);
      return `${objectTypeName}[${indexTypeName}]`;
    } else if (arg.kind === ts.SyntaxKind.UnknownKeyword) {
      return 'unknown';
    } else if (arg.kind === ts.SyntaxKind.AnyKeyword) {
      return 'any';
    } else if (arg.kind === ts.SyntaxKind.NeverKeyword) {
      return 'never';
    } else if (ts.isConditionalTypeNode(arg)) {
      const checkTypeName = this.calcTypeName(arg.checkType);
      const extendsTypeName = this.calcTypeName(arg.extendsType);
      const trueTypeName = this.calcTypeName(arg.trueType);
      const falseTypeName = this.calcTypeName(arg.falseType);
      return `${checkTypeName} extends ${extendsTypeName} ? ${trueTypeName} : ${falseTypeName}`;
    } else if (ts.isParenthesizedTypeNode(arg)) {
      const internalTypeName = this.calcTypeName(arg.type);
      return `(${internalTypeName})`; //Parentheses are not really interesting. The type name generation adds parentheses for the clarity
    }

    const warning = new GenerateMetaDataWarning(`This kind (${arg.kind}) is unhandled, so the type will be any, and no type conflict checks will made`, arg);

    console.warn(warning.toString());
    return 'any';
  }

  //Generates type name for type references
  private calcTypeReferenceTypeName(node: ts.TypeReferenceType): [ts.EntityName, string] {
    const type = TypeResolver.typeReferenceToEntityName(node);
    const refTypeName = this.calcRefTypeName(type);
    if (Array.isArray(node.typeArguments)) {
      // Add typeArguments for Synthetic nodes (e.g. Record<> in TestClassModel.indexedResponse)
      const argumentsString = node.typeArguments.map(type => this.calcTypeName(type));
      return [type, `${refTypeName}<${argumentsString.join(', ')}>`];
    }
    return [type, refTypeName];
  }

  private getReferenceType(node: ts.TypeReferenceType): Tsoa.ReferenceType {
    const [type, name] = this.calcTypeReferenceTypeName(node);
    const refTypeName = this.getRefTypeName(name);
    this.current.CheckExpressionUnicity(refTypeName, name);
    const context = this.typeArgumentsToContext(node, type);
    const referenceResolver = new TypeResolver({ ...this.occurrence, context }, this.current, this.parentNode);

    const build = (): Tsoa.ReferenceType => {
      const declarations = this.getModelTypeDeclarations(type);
      throwUnless(declarations.length, new GenerateMetadataError(`Could not find declarations for type '${name}'.`, node));
      const referenceTypes = declarations.map(declaration => {
        if (ts.isTypeAliasDeclaration(declaration)) return new ReferenceTransformer().transform(declaration, refTypeName, referenceResolver);
        if (EnumTransformer.transformable(declaration)) return new EnumTransformer().transform(this, declaration, refTypeName);
        return referenceResolver.getModelReference(declaration, refTypeName);
      });
      return ReferenceTransformer.merge(referenceTypes);
    };

    if (this.occurrence.kind === 'heritage') return build();
    const cached = this.cache.get(name);
    if (cached?.kind === 'complete') {
      this.current.AddReferenceType(cached.type);
      return cached.type;
    }
    if (cached?.kind === 'building') return this.createCircularDependencyResolver(cached, refTypeName);
    const building: ReferenceState = { kind: 'building', complete: [] };
    this.cache.set(name, building);
    try {
      const result = build();
      building.complete.forEach(complete => complete(result));
      this.cache.set(name, { kind: 'complete', type: result });
      this.current.AddReferenceType(result);
      return result;
    } catch (error) {
      this.cache.delete(name);
      throw error;
    }
  }

  private getModelReference(modelType: ts.InterfaceDeclaration | ts.ClassDeclaration, refTypeName: string) {
    const example = this.getNodeExample(modelType);
    const description = this.getNodeDescription(modelType);
    const deprecated = isExistJSDocTag(modelType, tag => tag.tagName.text === 'deprecated') || isDecorator(modelType, identifier => identifier.text === 'Deprecated');
    const title = this.getNodeTitle(modelType);

    // Handle toJSON methods
    throwUnless(modelType.name, new GenerateMetadataError("Can't get Symbol from anonymous class", modelType));

    const owner = this.memberOwner() || this.current.typeChecker.getTypeAtLocation(modelType.name);
    const toJSON = this.current.typeChecker.getPropertyOfType(owner, 'toJSON');
    if (toJSON && toJSON.valueDeclaration && (ts.isMethodDeclaration(toJSON.valueDeclaration) || ts.isMethodSignature(toJSON.valueDeclaration))) {
      const method = this.current.typeChecker.getTypeOfSymbol(toJSON);
      const signature = this.current.typeChecker.getSignaturesOfType(method, ts.SignatureKind.Call)[0];
      throwUnless(signature, new GenerateMetadataError('toJSON has no call signature.', toJSON.valueDeclaration));
      const exact = this.current.typeChecker.getReturnTypeOfSignature(signature);
      const type =
        toJSON.valueDeclaration.type && this.occurrence.kind !== 'computed'
          ? new TypeResolver(this.sourceOccurrence(toJSON.valueDeclaration.type, this.context, exact), this.current).resolve()
          : TypeResolver.fromComputed(exact, this.current).resolve();
      const referenceType: Tsoa.ReferenceType = {
        refName: refTypeName,
        dataType: 'refAlias',
        description,
        type,
        validators: {},
        deprecated,
        ...(example && { example }),
        ...(title && { title }),
      };
      return referenceType;
    }

    const properties = new PropertyTransformer().transform(this, modelType);
    const additionalProperties = this.getModelAdditionalProperties(modelType);
    const inheritedProperties = this.getModelInheritedProperties(modelType) || [];

    const referenceType: Tsoa.ReferenceType & { properties: Tsoa.Property[] } = {
      additionalProperties,
      dataType: 'refObject',
      description,
      properties: inheritedProperties,
      refName: refTypeName,
      deprecated,
      ...(example && { example }),
      ...(title && { title }),
    };

    referenceType.properties = referenceType.properties.concat(properties);

    return referenceType;
  }

  //Generates a name from the original type expression.
  //This function is not invertable, so it's possible, that 2 type expressions have the same refTypeName.
  private getRefTypeName(name: string): string {
    const preformattedName = name //Preformatted name handles most cases
      .replace(/<|>/g, '_')
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .replace(/'([^']*)'/g, '$1')
      .replace(/"([^"]*)"/g, '$1')
      .replace(/&/g, '-and-')
      .replace(/\|/g, '-or-')
      .replace(/\[\]/g, '-Array')
      .replace(/{|}/g, '_') // SuccessResponse_{indexesCreated-number}_ -> SuccessResponse__indexesCreated-number__
      .replace(/([a-z_0-9]+\??):([a-z]+)/gi, '$1-$2') // SuccessResponse_indexesCreated:number_ -> SuccessResponse_indexesCreated-number_
      .replace(/;/g, '--')
      .replace(/([a-z})\]])\[([a-z]+)\]/gi, '$1-at-$2'); // Partial_SerializedDatasourceWithVersion[format]_ -> Partial_SerializedDatasourceWithVersion~format~_,

    //Safety fixes to replace all characters which are not accepted by swagger ui
    let formattedName = preformattedName.replace(/[^A-Za-z0-9\-._]/g, match => {
      return `_${match.charCodeAt(0)}_`;
    });
    formattedName = formattedName.replace(/92_r_92_n/g, '92_n'); //Windows uses \r\n, but linux uses \n.

    return formattedName;
  }

  private createCircularDependencyResolver(state: Extract<ReferenceState, { kind: 'building' }>, refName: string): Tsoa.ReferenceType {
    const reference: Tsoa.ReferenceType = { dataType: 'refObject', refName, properties: [], deprecated: false };
    state.complete.push(completed => {
      Object.keys(reference).forEach(key => Reflect.deleteProperty(reference, key));
      Object.assign(reference, completed);
    });
    return reference;
  }

  private nodeIsUsable(node: ts.Node): node is UsableDeclarationWithoutPropertySignature {
    switch (node.kind) {
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
      case ts.SyntaxKind.EnumDeclaration:
      case ts.SyntaxKind.EnumMember:
        return true;
      default:
        return false;
    }
  }

  private getModelTypeDeclarations(type: ts.EntityName) {
    let typeName: string = type.kind === ts.SyntaxKind.Identifier ? type.text : type.right.text;

    let symbol: ts.Symbol | undefined = this.getSymbolAtLocation(type);
    if (!symbol && type.kind === ts.SyntaxKind.QualifiedName) {
      const fullEnumSymbol = this.getSymbolAtLocation(type.left);
      symbol = fullEnumSymbol.exports?.get(typeName as any);
    }

    // Handle built-in types that don't have declarations in user code
    if (!symbol || !symbol.getDeclarations) {
      return [];
    }

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
      return [];
    }

    if ((symbol.escapedName as string) !== typeName && (symbol.escapedName as string) !== 'default') {
      typeName = symbol.escapedName as string;
    }

    let modelTypes = declarations.filter((node): node is UsableDeclarationWithoutPropertySignature => {
      return this.nodeIsUsable(node) && node.name?.getText() === typeName;
    });

    // If no usable model types found, return empty array instead of throwing
    if (modelTypes.length === 0) {
      return [];
    }

    if (modelTypes.length > 1) {
      const nonLibModelTypes = modelTypes.filter(modelType => {
        return modelType.getSourceFile().fileName.replace(/\\/g, '/').toLowerCase().indexOf('node_modules/typescript') <= -1;
      });
      // ES2022 adds cause to Error in a second library declaration.
      const keepLibDeclarations = nonLibModelTypes.length === 0 && typeName === 'Error';
      if (!keepLibDeclarations) {
        modelTypes = nonLibModelTypes;
      }

      modelTypes = this.getDesignatedModels(modelTypes, typeName);
    }

    return modelTypes;
  }

  private getSymbolAtLocation(type: ts.Node): ts.Symbol {
    const symbol = this.current.typeChecker.getSymbolAtLocation(type) || (ts.isQualifiedName(type) ? this.getSymbolAtLocation(type.right) : ((type as any).symbol as ts.Symbol));
    // resolve alias if it is an alias, otherwise take symbol directly
    return (symbol && this.hasFlag(symbol, ts.SymbolFlags.Alias) && this.current.typeChecker.getAliasedSymbol(symbol)) || symbol;
  }

  private getModelAdditionalProperties(node: UsableDeclaration) {
    const index = ts.isInterfaceDeclaration(node) ? node.members.find(ts.isIndexSignatureDeclaration) : undefined;
    return index && this.resolveIndex(index);
  }

  private resolveIndex(index: ts.IndexSignatureDeclaration): Tsoa.Type {
    const key = index.parameters[0].type;
    throwUnless(key, new GenerateMetadataError('Index signature has no key type.', index));
    throwUnless(this.occurrence.kind !== 'computed' || key.kind === ts.SyntaxKind.StringKeyword, new GenerateMetadataError('Only string indexers are supported.', index));
    const keyType = this.occurrence.kind === 'computed' ? this.current.typeChecker.getStringType() : undefined;
    const resolvedKey = keyType ? this.computedChild(keyType).resolve() : this.sourceChild(key).resolve();
    throwUnless(resolvedKey.dataType === 'string', new GenerateMetadataError('Only string indexers are supported.', index));
    const owner = this.memberOwner();
    const exact = owner && this.current.typeChecker.getIndexTypeOfType(owner, ts.IndexKind.String);
    if (this.occurrence.kind === 'computed') {
      throwUnless(exact, new GenerateMetadataError('Computed index has no value owner.', index));
      return this.computedChild(exact).resolve();
    }
    return this.sourceChild(index.type, this.parentNode, exact).resolve();
  }

  private typeArgumentsToContext(type: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments, targetEntity: ts.EntityName): Context {
    const context = new Map<ts.Symbol, Binding>();
    const declarations = this.getModelTypeDeclarations(targetEntity);
    const declaration = declarations[0];
    const parameters = declaration && 'typeParameters' in declaration ? declaration.typeParameters : undefined;
    const exactArguments = this.compilerArguments();
    for (let index = 0; parameters && index < parameters.length; index++) {
      const parameter = parameters[index];
      const symbol = this.current.typeChecker.getSymbolAtLocation(parameter.name);
      throwUnless(symbol, new GenerateMetadataError('Type parameter has no declaration symbol.', parameter));
      if (this.occurrence.kind === 'computed') {
        const exact = exactArguments[index];
        throwUnless(exact, new GenerateMetadataError('Computed reference has no concrete argument.', parameter));
        const resolver = this.computedChild(exact);
        context.set(symbol, { occurrence: resolver.occurrence, name: resolver.calcTypeName(resolver.typeNode) });
        continue;
      }
      const argument = type.typeArguments?.[index];
      const forwarded = argument && ts.isTypeReferenceNode(argument) ? this.binding(argument.typeName) : undefined;
      if (forwarded) {
        context.set(symbol, forwarded);
        continue;
      }
      const node = argument || parameter.default;
      throwUnless(node, new GenerateMetadataError(`Could not find a value for type parameter ${parameter.name.text}`, type));
      const scope = argument ? this.context : new Map([...this.context, ...context]);
      const occurrence = this.sourceOccurrence(node, scope, exactArguments[index]);
      const resolver = new TypeResolver(occurrence, this.current, this.parentNode);
      context.set(symbol, { occurrence, name: resolver.calcTypeName(node) });
    }
    return context;
  }

  private compilerArguments(): readonly ts.Type[] {
    const exact = this.exactType();
    if (!exact) return [];
    const name = ts.isTypeReferenceNode(this.typeNode) ? this.typeNode.typeName : ts.isImportTypeNode(this.typeNode) ? this.typeNode.qualifier : undefined;
    const symbol = name && this.getSymbolAtLocation(name);
    if (exact.aliasSymbol === symbol && exact.aliasTypeArguments) return exact.aliasTypeArguments;
    if (exact.flags & ts.TypeFlags.Object && 'objectFlags' in exact && typeof exact.objectFlags === 'number' && exact.objectFlags & ts.ObjectFlags.Reference) {
      return this.current.typeChecker.getTypeArguments(exact as ts.TypeReference);
    }
    return [];
  }

  private argumentChild(node: ts.TypeNode, index: number, parent = this.parentNode): TypeResolver {
    const exact = this.compilerArguments()[index];
    if (this.occurrence.kind === 'computed') {
      throwUnless(exact, new GenerateMetadataError('Computed wrapper has no concrete argument.', this.typeNode));
      return this.computedChild(exact, parent);
    }
    return this.sourceChild(node, parent, exact);
  }

  private getModelInheritedProperties(modelTypeDeclaration: Exclude<UsableDeclaration, ts.PropertySignature | ts.TypeAliasDeclaration | ts.EnumMember>): Tsoa.Property[] {
    let properties: Tsoa.Property[] = [];

    const excluded = new Set(this.occurrence.kind === 'heritage' ? this.occurrence.excluded : []);
    for (const member of modelTypeDeclaration.members) {
      if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) excluded.add(this.getPropertyName(member));
      if (ts.isConstructorDeclaration(member))
        member.parameters.filter(parameter => ts.isParameterPropertyDeclaration(parameter, member)).forEach(parameter => excluded.add(this.getPropertyName(parameter)));
    }
    const heritageClauses = modelTypeDeclaration.heritageClauses;
    if (!heritageClauses) {
      return properties;
    }

    for (const clause of heritageClauses) {
      if (!clause.types) {
        continue;
      }

      for (const t of clause.types) {
        const owner = this.memberOwner();
        const inherited = new TypeResolver(
          { ...this.sourceOccurrence(t, this.context), kind: 'heritage', baseNode: t, owner: owner ? { kind: 'exact', type: owner } : { kind: 'bound' }, excluded },
          this.current,
          this.parentNode,
        );
        const referenceType = inherited.getReferenceType(t);
        if (referenceType) {
          if (referenceType.dataType === 'refEnum') {
            // since it doesn't have properties to iterate over, then we don't do anything with it
          } else if (referenceType.dataType === 'refAlias') {
            let type: Tsoa.Type = referenceType;
            while (type.dataType === 'refAlias') {
              type = type.type;
            }

            if (type.dataType === 'refObject') {
              properties = [...properties, ...type.properties];
            } else if (type.dataType === 'nestedObjectLiteral') {
              properties = [...properties, ...type.properties];
            }
          } else if (referenceType.dataType === 'refObject') {
            (referenceType.properties || []).forEach(property => properties.push(property));
          } else {
            assertNever(referenceType);
          }
        }
      }
    }

    return properties;
  }

  public getNodeDescription(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
    const symbol = this.getSymbolAtLocation(node.name as ts.Node);
    if (!symbol) {
      return undefined;
    }

    /**
     * TODO: Workaround for what seems like a bug in the compiler
     * Warrants more investigation and possibly a PR against typescript
     */
    if (node.kind === ts.SyntaxKind.Parameter) {
      // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
      symbol.flags = 0;
    }

    const comments = symbol.getDocumentationComment(this.current.typeChecker);
    if (comments.length) {
      return ts.displayPartsToString(comments);
    }

    return undefined;
  }

  public getNodeFormat(node: ts.Node) {
    return getJSDocComment(node, 'format');
  }

  public getNodeTitle(node: ts.Node) {
    return getJSDocComment(node, 'title');
  }

  public getPropertyName(prop: ts.PropertySignature | ts.PropertyDeclaration | ts.ParameterDeclaration): string {
    if (ts.isComputedPropertyName(prop.name) && ts.isPropertyAccessExpression(prop.name.expression)) {
      const initializerValue = getInitializerValue(prop.name.expression, this.current.typeChecker);
      if (initializerValue) {
        return initializerValue?.toString();
      }
    }
    return (prop.name as ts.Identifier).text;
  }

  public getNodeExample(node: ts.Node) {
    const exampleJSDoc = getJSDocComment(node, 'example');
    if (exampleJSDoc) {
      return safeFromJson(exampleJSDoc);
    }

    return getNodeFirstDecoratorValue(node, this.current.typeChecker, dec => dec.text === 'Example');
  }

  public getNodeExtension(node: ts.Node) {
    const decorators = this.getDecoratorsByIdentifier(node, 'Extension');
    const extensionDecorator = getExtensions(decorators, this.current);

    const extensionComments = getJSDocComments(node, 'extension');
    const extensionJSDoc = extensionComments ? getExtensionsFromJSDocComments(extensionComments) : [];

    return extensionDecorator.concat(extensionJSDoc);
  }

  private getDecoratorsByIdentifier(node: ts.Node, id: string) {
    return getDecorators(node, identifier => identifier.text === id);
  }

  public static getDefault(node: ts.Node) {
    const defaultStr = getJSDocComment(node, 'default');
    if (typeof defaultStr == 'string' && defaultStr !== 'undefined') {
      let textStartCharacter: `"` | "'" | '`' | undefined = undefined;
      const inString = () => textStartCharacter !== undefined;

      let formattedStr = '';
      for (let i = 0; i < defaultStr.length; ++i) {
        const actCharacter = defaultStr[i];
        if (inString()) {
          if (actCharacter === textStartCharacter) {
            formattedStr += '"';
            textStartCharacter = undefined;
          } else if (actCharacter === '"') {
            formattedStr += '\\"';
          } else if (actCharacter === '\\') {
            ++i;
            if (i < defaultStr.length) {
              const nextCharacter = defaultStr[i];
              if (['n', 't', 'r', 'b', 'f', '\\', '"'].includes(nextCharacter)) {
                formattedStr += '\\' + nextCharacter;
              } else if (!['v', '0'].includes(nextCharacter)) {
                //\v, \0 characters are not compatible with JSON
                formattedStr += nextCharacter;
              }
            } else {
              formattedStr += actCharacter; // this is a bug, but let the JSON parser decide how to handle it
            }
          } else {
            formattedStr += actCharacter;
          }
        } else {
          if ([`"`, "'", '`'].includes(actCharacter)) {
            textStartCharacter = actCharacter as `"` | "'" | '`';
            formattedStr += '"';
          } else if (actCharacter === '/' && i + 1 < defaultStr.length && defaultStr[i + 1] === '/') {
            i += 2;
            while (i < defaultStr.length && defaultStr[i] !== '\n') {
              ++i;
            }
          } else {
            formattedStr += actCharacter;
          }
        }
      }
      try {
        const parsed = JSON.parse(formattedStr);
        return parsed;
      } catch (err) {
        throw new GenerateMetadataError(`JSON could not parse default str: "${defaultStr}", preformatted: "${formattedStr}"\nmessage: "${((err as any)?.message as string) || '-'}"`);
      }
    }
    return undefined;
  }
}
