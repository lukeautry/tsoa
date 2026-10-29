import { assertNever, Tsoa } from '@tsoa/runtime';
import * as ts from '../ts';
import { safeFromJson } from '../utils/jsonUtils';
import { getDecorators, getNodeFirstDecoratorValue, isDecorator } from './../utils/decoratorUtils';
import { getJSDocComment, getJSDocComments, getJSDocTagNames, getSymbolDocumentation, isExistJSDocTag } from './../utils/jsDocUtils';
import { getPropertyValidators } from './../utils/validatorUtils';
import { throwUnless } from '../utils/flowUtils';
import { GenerateMetadataError, GenerateMetaDataWarning } from './exceptions';
import { getExtensions, getExtensionsFromJSDocComments } from './extension';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { isSynthetic, printType, syntheticSymbol, syntheticType, tupleElementNode, typeOfTypeNode } from './syntheticChildType';

import { PrimitiveTransformer } from './transformer/primitiveTransformer';
import { DateTransformer } from './transformer/dateTransformer';
import { EnumTransformer } from './transformer/enumTransformer';
import { PropertyTransformer } from './transformer/propertyTransformer';
import { ReferenceTransformer } from './transformer/referenceTransformer';

const localReferenceTypeCache: { [typeName: string]: Tsoa.ReferenceType } = {};

const inProgressTypes: { [typeName: string]: Array<(realType: Tsoa.ReferenceType) => void> } = {};

// Reference types resolve concurrently. A branch that needs a type another branch is resolving waits for it,
// and records which types' resolution that wait holds up: a wait that would close a cycle gets a placeholder instead.
const waitEdges = new Map<string, Map<string, number>>();
const maxWaitRounds = 100_000;

function addWaits(waiting: ReadonlySet<string>, awaited: string, delta: 1 | -1) {
  for (const name of waiting) {
    const edges = waitEdges.get(name) ?? new Map<string, number>();
    const count = (edges.get(awaited) ?? 0) + delta;
    if (count > 0) {
      edges.set(awaited, count);
    } else {
      edges.delete(awaited);
    }
    waitEdges.set(name, edges);
  }
}

/** Whether the resolution of `start` waits, directly or through other types, for one of `targets`. */
function waitsFor(start: string, targets: ReadonlySet<string>): boolean {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const name = stack.pop()!;
    if (targets.has(name)) {
      return true;
    }
    if (!seen.has(name)) {
      seen.add(name);
      stack.push(...(waitEdges.get(name)?.keys() ?? []));
    }
  }
  return false;
}

const noAncestors: ReadonlySet<string> = new Set();

// Symbols of entity names, after aliases. Type references resolve their names more than once.
const symbolsAtLocation: ts.MemoCache<ts.Node, ts.Symbol | undefined> = new WeakMap();

type UsableDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.PropertySignatureDeclaration | ts.TypeAliasDeclaration | ts.EnumMember;
type UsableDeclarationWithoutPropertySignature = Exclude<UsableDeclaration, ts.PropertySignatureDeclaration>;
type TypeReferenceType = ts.TypeReferenceNode | ts.ExpressionWithTypeArguments;
interface Context {
  [name: string]: {
    type: ts.TypeNode;
    name: string;
  };
}

export class TypeResolver {
  constructor(
    private readonly typeNode: ts.TypeNode,
    public readonly current: MetadataGenerator,
    private readonly parentNode?: ts.Node,
    public context: Context = {},
    public readonly referencer?: ts.Type,
    private readonly enclosingDeclaration?: ts.Node,
    /** The reference types being resolved by the chain of resolvers that led to this one. */
    public readonly ancestors: ReadonlySet<string> = noAncestors,
  ) {}

  public static clearCache() {
    Object.keys(localReferenceTypeCache).forEach(key => {
      delete localReferenceTypeCache[key];
    });

    Object.keys(inProgressTypes).forEach(key => {
      delete inProgressTypes[key];
    });

    waitEdges.clear();
  }

  public *resolve(): ts.Op<Tsoa.Type> {
    const partentJsDocTagNames = this.parentNode ? getJSDocTagNames(this.parentNode) : undefined;
    const primitiveType = new PrimitiveTransformer().transform(this.current.defaultNumberType, this.typeNode, partentJsDocTagNames);
    if (primitiveType) {
      return primitiveType;
    }

    if (ts.isArrayTypeNode(this.typeNode)) {
      const arrayMetaType: Tsoa.ArrayType = {
        dataType: 'array',
        elementType: yield* (yield* this.child(this.typeNode.elementType)).resolve(),
      };
      return arrayMetaType;
    }

    if (ts.isRestTypeNode(this.typeNode)) {
      return yield* (yield* this.child(this.typeNode.type)).resolve();
    }

    const isUnion = ts.isUnionTypeNode(this.typeNode);
    if (isUnion || ts.isIntersectionTypeNode(this.typeNode)) {
      const types = yield* ts.map(
        this.typeNode.types,
        function* (this: TypeResolver, type: ts.TypeNode) {
          return yield* (yield* this.child(type)).resolve();
        }.bind(this),
      );
      return { dataType: isUnion ? 'union' : 'intersection', types };
    }

    if (ts.isTupleTypeNode(this.typeNode)) {
      const elements = this.typeNode.elements;
      const resolved = yield* ts.map(
        elements,
        function* (this: TypeResolver, element: ts.TypeNode) {
          return yield* (yield* this.child(tupleElementNode(element), element)).resolve();
        }.bind(this),
      );
      const elementTypes: Tsoa.Type[] = [];
      let restType: Tsoa.Type | undefined;

      elements.forEach((element, index) => {
        const type = resolved[index];
        if (ts.isRestTypeNode(element)) {
          restType = tupleElementNode(element) === element.type && type.dataType === 'array' ? type.elementType : type;
        } else {
          elementTypes.push(type);
        }
      });

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
      const propertySignatures = this.typeNode.members.filter(ts.isPropertySignatureDeclaration);
      const properties = yield* ts.map(
        propertySignatures,
        function* (this: TypeResolver, propertySignature: ts.PropertySignatureDeclaration): ts.Op<Tsoa.Property> {
          const type = yield* (yield* this.child(propertySignature.type, propertySignature)).resolve();

          const def = TypeResolver.getDefault(propertySignature);
          return {
            example: yield* this.getNodeExample(propertySignature),
            default: def,
            description: yield* this.getNodeDescription(propertySignature),
            format: this.getNodeFormat(propertySignature),
            name: yield* this.getPropertyName(propertySignature),
            required: !ts.hasQuestionToken(propertySignature),
            type,
            validators: getPropertyValidators(propertySignature) || {},
            deprecated: isExistJSDocTag(propertySignature, tag => tag.tagName.text === 'deprecated'),
            title: this.getNodeTitle(propertySignature),
            extensions: yield* this.getNodeExtension(propertySignature),
          };
        }.bind(this),
      );
      // Members are listed last to first.
      properties.reverse();

      const indexMember = this.typeNode.members.find(member => ts.isIndexSignatureDeclaration(member));
      let additionalType: Tsoa.Type | undefined;

      if (indexMember) {
        /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
        const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
        const indexType = yield* (yield* this.child(indexSignatureDeclaration.parameters[0].type as ts.TypeNode)).resolve();

        throwUnless(indexType.dataType === 'string', new GenerateMetadataError(`Only string indexers are supported.`, this.typeNode));

        additionalType = yield* (yield* this.child(indexSignatureDeclaration.type)).resolve();
      }

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
      return yield* this.resolveMappedType(this.typeNode, yield* this.getReferencer());
    }

    if (ts.isConditionalTypeNode(this.typeNode)) {
      const referencer = yield* this.getReferencer();
      const resolver = yield* this.printedResolver(referencer, this.typeNode);
      if (ts.isConditionalTypeNode(resolver.typeNode)) {
        throw new GenerateMetadataError(`The conditional type ${yield* this.current.typeChecker.typeToString.gen(referencer)} did not resolve.`, this.typeNode);
      }
      return yield* resolver.resolve();
    }

    // keyof & readonly arrays
    if (ts.isTypeOperatorNode(this.typeNode)) {
      return yield* this.resolveTypeOperatorNode(this.typeNode, this.current.typeChecker, this.current, this.context, this.parentNode);
    }

    // Indexed type
    if (ts.isIndexedAccessTypeNode(this.typeNode)) {
      return yield* this.resolveIndexedAccessTypeNode(this.typeNode, this.current.typeChecker, this.current, this.context);
    }

    if (ts.isTemplateLiteralTypeNode(this.typeNode)) {
      const type = yield* this.getReferencer();
      const members = type.isUnionType() ? yield* type.getTypes.gen() : [];
      if (!members.length || !members.every((unionElementType): unionElementType is ts.StringLiteralType => unionElementType.isStringLiteralType())) {
        const typeName = yield* this.current.typeChecker.typeToString.gen(type, isSynthetic(this.typeNode) ? undefined : this.typeNode);
        throw new GenerateMetadataError(`Could not determine the type of ${typeName}`, this.typeNode);
      }

      // `a${'c' | 'd'}b`
      const stringLiteralEnum: Tsoa.EnumType = {
        dataType: 'enum',
        enums: members.map(stringLiteralType => stringLiteralType.value),
      };
      return stringLiteralEnum;
    }

    if (ts.isParenthesizedTypeNode(this.typeNode)) {
      return yield* new TypeResolver(this.typeNode.type, this.current, this.typeNode, this.context, this.referencer, this.enclosingDeclaration, this.ancestors).resolve();
    }

    throwUnless(this.typeNode.kind === ts.SyntaxKind.TypeReference, new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[this.typeNode.kind]}`, this.typeNode));

    return yield* this.resolveTypeReferenceNode(this.typeNode as ts.TypeReferenceNode, this.current, this.context, this.parentNode);
  }

  private *resolveMappedType(mappedTypeNode: ts.MappedTypeNode, mappedType: ts.Type): ts.Op<Tsoa.Type> {
    const checker = this.current.typeChecker;
    const getOneOrigDeclaration = function* (prop: ts.Symbol): ts.Op<ts.Declaration | undefined> {
      return (yield* ts.getDeclarations(prop))[0];
    };
    const isIgnored = (declaration: ts.Declaration | undefined) =>
      declaration !== undefined &&
      (getJSDocTagNames(declaration).some(tag => tag === 'ignore') ||
        (!ts.isPropertyDeclaration(declaration) && !ts.isPropertySignatureDeclaration(declaration) && !ts.isParameterDeclaration(declaration)));

    const calcMappedType = function* (this: TypeResolver, type: ts.Type): ts.Op<Tsoa.Type> {
      if (this.hasFlag(type, ts.TypeFlags.Union)) {
        //Intersections are not interesting somehow...
        const types = yield* (type as ts.UnionType).getTypes.gen();
        const resolvedTypes = yield* ts.map(types, member => calcMappedType(member));
        return {
          dataType: 'union',
          types: resolvedTypes,
        };
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
        const typeProperties = yield* type.getProperties.gen();
        //If there are more declarations, we need to get one of them, from where we want to recognize jsDoc
        const declarations = yield* ts.map(typeProperties, getOneOrigDeclaration);
        // Ignore methods, getter, setter and @ignored props
        const kept = typeProperties.map((property, index) => ({ property, parent: declarations[index] })).filter(({ parent }) => !isIgnored(parent));
        // Transform to property
        const properties = yield* ts.map(
          kept,
          function* (this: TypeResolver, { property, parent }: { property: ts.Symbol; parent: ts.Declaration | undefined }): ts.Op<Tsoa.Property> {
            const propertyType = isSynthetic(this.typeNode) ? yield* checker.getTypeOfSymbol.gen(property) : yield* checker.getTypeOfSymbolAtLocation.gen(property, this.typeNode);

            const type = yield* (yield* this.printedResolver(propertyType, parent)).resolve();

            const required = !this.hasFlag(property, ts.SymbolFlags.Optional);

            const description = yield* getSymbolDocumentation(property, checker);

            const initializer = (parent as any)?.initializer;
            const def = initializer ? yield* getInitializerValue(initializer, checker) : parent ? TypeResolver.getDefault(parent) : undefined;

            // Push property
            return {
              name: property.name,
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
              example: parent ? yield* this.getNodeExample(parent) : undefined,
              extensions: parent ? yield* this.getNodeExtension(parent) : undefined,
            };
          }.bind(this),
        );

        const objectLiteral: Tsoa.NestedObjectLiteralType = {
          dataType: 'nestedObjectLiteral',
          properties,
        };
        const indexInfos = yield* checker.getIndexInfosOfType.gen(type);
        const indexResolvers = yield* ts.map(indexInfos, indexInfo => this.printedResolver(indexInfo.valueType, mappedTypeNode));
        // { [k: string]: never; } adds nothing
        const indexTypes = yield* ts.map(
          indexResolvers.filter(resolver => resolver.typeNode.kind !== ts.SyntaxKind.NeverKeyword),
          resolver => resolver.resolve(),
        );
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
    }.bind(this);

    return yield* calcMappedType(mappedType);
  }

  private *resolveTypeOperatorNode(typeNode: ts.TypeOperatorNode, typeChecker: ts.Checker, current: MetadataGenerator, context: Context, parentNode?: ts.Node): ts.Op<Tsoa.Type> {
    switch (typeNode.operator) {
      case ts.SyntaxKind.KeyOfKeyword: {
        // keyof
        const type = yield* typeOfTypeNode(typeChecker, typeNode);
        throwUnless(type, new GenerateMetadataError(`Could not determine the type of keyof`, typeNode));
        if (type.isIndexType()) {
          // in case of generic: keyof T. Not handles all possible cases
          const symbol = yield* (yield* type.getTarget.gen()).getSymbol.gen();
          if (symbol && this.hasFlag(symbol, ts.SymbolFlags.TypeParameter)) {
            const typeName = symbol.escapedName;
            throwUnless(typeof typeName === 'string', new GenerateMetadataError(`typeName is not string, but ${typeof typeName}`, typeNode));

            if (context[typeName]) {
              const subResult = yield* new TypeResolver(context[typeName].type, current, parentNode, context, undefined, undefined, this.ancestors).resolve();
              if (subResult.dataType === 'any') {
                return {
                  dataType: 'union',
                  types: [{ dataType: 'string' }, { dataType: 'double' }],
                };
              }
              const properties = (subResult as Tsoa.RefObjectType).properties?.map(v => v.name);
              throwUnless(properties, new GenerateMetadataError(`TypeOperator 'keyof' on node which have no properties`, context[typeName].type));

              return {
                dataType: 'enum',
                enums: properties,
              };
            }
          }
        } else if (type.isUnionType()) {
          const types = yield* type.getTypes.gen();
          const literals = types.filter((t): t is ts.LiteralType => t.isLiteralType());
          const literalValues: Array<string | number> = [];
          for (const literal of literals) {
            if (typeof literal.value != 'number' && typeof literal.value != 'string') {
              throw new GenerateMetadataError(`Not handled key Type, maybe ts.PseudoBigInt ${yield* typeChecker.typeToString.gen(literal)}`, typeNode);
            }
            literalValues.push(literal.value);
          }

          if (!literals.length) {
            const length = types.length;
            const someStringFlag = types.some(t => t.flags === ts.TypeFlags.String);
            const someNumberFlag = types.some(t => t.flags === ts.TypeFlags.Number);
            const someSymbolFlag = types.some(t => t.flags === ts.TypeFlags.ESSymbol);

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
          if (types.find(t => !t.isLiteralType()) !== undefined) {
            const problems = yield* ts.map(
              types.filter(t => !t.isLiteralType()),
              t => typeChecker.typeToString.gen(t),
            );
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
        } else if (type.isLiteralType()) {
          if (typeof type.value != 'number' && typeof type.value != 'string') {
            throw new GenerateMetadataError(`Not handled indexType, maybe ts.PseudoBigInt ${yield* typeChecker.typeToString.gen(type)}`, typeNode);
          }

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
        const indexedType = yield* typeOfTypeNode(typeChecker, typeNode.type);
        const indexedTypeName = indexedType ? yield* typeChecker.typeToString.gen(indexedType) : yield* ts.nodeText(typeNode.type);
        throw new GenerateMetadataError(`Could not determine the keys on ${indexedTypeName}`, typeNode);
      }
      case ts.SyntaxKind.ReadonlyKeyword:
        // Handle `readonly` arrays
        return yield* new TypeResolver(typeNode.type, this.current, typeNode, this.context, this.referencer, this.enclosingDeclaration, this.ancestors).resolve();
      default:
        throw new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`, typeNode);
    }
  }

  private *resolveIndexedAccessTypeNode(typeNode: ts.IndexedAccessTypeNode, typeChecker: ts.Checker, current: MetadataGenerator, context: Context): ts.Op<Tsoa.Type> {
    const { indexType, objectType } = typeNode;

    if ([ts.SyntaxKind.NumberKeyword, ts.SyntaxKind.StringKeyword].includes(indexType.kind)) {
      // Indexed by keyword
      const isNumberIndexType = indexType.kind === ts.SyntaxKind.NumberKeyword;
      const typeOfObjectType = yield* this.typeOfObjectType(objectType);
      const type = isNumberIndexType ? yield* typeOfObjectType.getNumberIndexType.gen() : yield* typeOfObjectType.getStringIndexType.gen();
      if (!type) {
        throw new GenerateMetadataError(`Could not determine ${isNumberIndexType ? 'number' : 'string'} index on ${yield* typeChecker.typeToString.gen(typeOfObjectType)}`, typeNode);
      }
      return yield* (yield* this.printedResolver(type, typeNode, objectType)).resolve();
    } else if (ts.isLiteralTypeNode(indexType) && (ts.isStringLiteral(indexType.literal) || ts.isNumericLiteral(indexType.literal))) {
      // Indexed by literal
      const typeOfObjectType = yield* this.typeOfObjectType(objectType);
      const symbol = yield* typeChecker.getPropertyOfType.gen(typeOfObjectType, indexType.literal.text);
      if (!symbol) {
        throw new GenerateMetadataError(`Could not determine the keys on ${yield* typeChecker.typeToString.gen(typeOfObjectType)}`, typeNode);
      }
      const declaredType = ((yield* ts.getValueDeclaration(symbol)) as { type?: ts.TypeNode } | undefined)?.type;
      if (declaredType) {
        return yield* new TypeResolver(declaredType, current, typeNode, context, undefined, undefined, this.ancestors).resolve();
      }
      const declaration = isSynthetic(objectType) ? yield* typeChecker.getTypeOfSymbol.gen(symbol) : yield* typeChecker.getTypeOfSymbolAtLocation.gen(symbol, objectType);
      try {
        return yield* (yield* this.printedResolver(declaration, typeNode, objectType)).resolve();
      } catch {
        throw new GenerateMetadataError(`Could not determine the keys on ${yield* typeChecker.typeToString.gen(declaration)}`, typeNode);
      }
    } else if (ts.isTypeOperatorNode(indexType) && indexType.operator === ts.SyntaxKind.KeyOfKeyword) {
      // Indexed by keyof typeof value
      const typeOfObjectType = ts.isParenthesizedTypeNode(objectType) ? objectType.type : objectType;
      const { type: typeOfIndexType } = indexType;
      const isSameTypeQuery =
        ts.isTypeQueryNode(typeOfObjectType) && ts.isTypeQueryNode(typeOfIndexType) && (yield* ts.nodeText(typeOfObjectType.exprName)) === (yield* ts.nodeText(typeOfIndexType.exprName));
      const isSameTypeReference =
        ts.isTypeReferenceNode(typeOfObjectType) && ts.isTypeReferenceNode(typeOfIndexType) && (yield* ts.nodeText(typeOfObjectType.typeName)) === (yield* ts.nodeText(typeOfIndexType.typeName));
      if (isSameTypeQuery || isSameTypeReference) {
        return yield* (yield* this.printedResolver(yield* this.getReferencer(), typeNode, undefined, ts.NodeBuilderFlags.InTypeAlias | ts.NodeBuilderFlags.NoTruncation)).resolve();
      }
    }
    throw new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`, typeNode);
  }

  private *resolveTypeReferenceNode(typeNode: ts.TypeReferenceNode, current: MetadataGenerator, context: Context, parentNode?: ts.Node): ts.Op<Tsoa.Type> {
    const { typeName, typeArguments } = typeNode;

    if (typeName.kind !== ts.SyntaxKind.Identifier) {
      return yield* this.getReferenceType(typeNode);
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
            elementType: yield* new TypeResolver(typeArguments[0], current, parentNode, context, undefined, undefined, this.ancestors).resolve(),
          };
        }
        break;
      case 'Promise':
        if (typeArguments && typeArguments.length === 1) {
          return yield* new TypeResolver(typeArguments[0], current, parentNode, context, undefined, undefined, this.ancestors).resolve();
        }
        break;
      case 'String':
        return { dataType: 'string' };
      default:
        if (context[typeName.text]) {
          return yield* new TypeResolver(context[typeName.text].type, current, parentNode, context, undefined, undefined, this.ancestors).resolve();
        }
    }

    return yield* this.getReferenceType(typeNode);
  }

  private getLiteralValue(typeNode: ts.LiteralTypeNode): string | number | boolean | null {
    switch (typeNode.literal.kind) {
      case ts.SyntaxKind.TrueKeyword:
        return true;
      case ts.SyntaxKind.FalseKeyword:
        return false;
      case ts.SyntaxKind.StringLiteral:
        return (typeNode.literal as ts.StringLiteral).text;
      case ts.SyntaxKind.NumericLiteral:
        return parseFloat((typeNode.literal as ts.NumericLiteral).text);
      case ts.SyntaxKind.PrefixUnaryExpression: {
        // make sure to only handle the MinusToken here
        const literal = typeNode.literal as ts.PrefixUnaryExpression;
        throwUnless(literal.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(literal.operand), new GenerateMetadataError(`Couldn't resolve literal node`, typeNode));
        return -parseFloat((literal.operand as ts.NumericLiteral).text);
      }
      case ts.SyntaxKind.NullKeyword:
        return null;
      default:
        throwUnless('text' in typeNode.literal, new GenerateMetadataError(`Couldn't resolve literal node`, typeNode));
        return (typeNode.literal as ts.LiteralExpression).text;
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

  private *printedResolver(type: ts.Type, parentNode: ts.Node | undefined, enclosingDeclaration?: ts.Node, flags = ts.NodeBuilderFlags.NoTruncation): ts.Op<TypeResolver> {
    const node = yield* printType(this.current.typeChecker, type, enclosingDeclaration, flags);
    if (!node) {
      throw new GenerateMetadataError(`Could not print the type ${yield* this.current.typeChecker.typeToString.gen(type)}`, parentNode);
    }
    return new TypeResolver(node, this.current, parentNode, this.context, type, enclosingDeclaration, this.ancestors);
  }

  private *child(node: ts.TypeNode, parentNode = this.parentNode): ts.Op<TypeResolver> {
    return new TypeResolver(node, this.current, parentNode, this.context, yield* syntheticType(this.current.typeChecker, node), this.enclosingDeclaration, this.ancestors);
  }

  /** This resolver, as part of the resolution of the reference type `name`. */
  private resolvingReference(name: string): TypeResolver {
    return new TypeResolver(this.typeNode, this.current, this.parentNode, this.context, this.referencer, this.enclosingDeclaration, new Set([...this.ancestors, name]));
  }

  private *getReferencer(): ts.Op<ts.Type> {
    const type = this.referencer ?? (yield* typeOfTypeNode(this.current.typeChecker, this.typeNode));
    throwUnless(type, new GenerateMetadataError(`Can not succeeded to calculate referencer type.`, this.typeNode));
    return type;
  }

  private *typeOfObjectType(objectType: ts.TypeNode): ts.Op<ts.Type> {
    const type = yield* typeOfTypeNode(this.current.typeChecker, objectType);
    if (!type) {
      throw new GenerateMetadataError(`Could not determine the type of ${yield* ts.nodeText(objectType)}`, objectType);
    }
    return type;
  }

  private static typeReferenceToEntityName(node: TypeReferenceType): ts.EntityName {
    if (ts.isTypeReferenceNode(node)) {
      return node.typeName;
    } else if (ts.isExpressionWithTypeArguments(node)) {
      return node.expression as ts.EntityName;
    }
    throw new GenerateMetadataError(`Can't resolve Reference type.`);
  }

  //Generates type name for type references
  private *calcRefTypeName(type: ts.EntityName): ts.Op<string> {
    const getEntityName = (type: ts.EntityName): string => {
      if (ts.isIdentifier(type)) {
        return type.text;
      }
      return `${getEntityName(type.left)}.${type.right.text}`;
    };

    let name = getEntityName(type);
    if (this.context[name]) {
      //resolve name only interesting if entity is not qualifiedName
      name = this.context[name].name; //Not needed to check unicity, because generic parameters are checked previously
    } else {
      const declarations = yield* this.getModelTypeDeclarations(type);

      // Handle cases where declarations is empty (e.g., inline object types in generics)
      if (!declarations || declarations.length === 0) {
        // Check if this is a simple identifier (like Date, String, etc.)
        if (ts.isIdentifier(type)) {
          // For simple identifiers, just return the name
          return type.text;
        }

        // For inline object types, we should use the resolve method to get the proper type
        // This will handle TypeLiteralNode, UnionTypeNode, etc. properly
        // Note: We need to cast to TypeNode since EntityName can be Identifier or QualifiedName
        const typeNode = type as unknown as ts.TypeNode;
        const resolvedType = yield* new TypeResolver(typeNode, this.current, this.parentNode, this.context, undefined, undefined, this.ancestors).resolve();

        // Generate a deterministic name for this inline type based on its structure
        const typeName = yield* this.calcTypeName(typeNode);
        const sanitizedName = typeName
          .replace(/[^A-Za-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        const uniqueName = `Inline_${sanitizedName}`;

        // Add to reference types so it can be properly serialized
        // We need to create a proper ReferenceType object
        const referenceType: Tsoa.ReferenceType = {
          dataType: 'refAlias',
          refName: uniqueName,
          type: resolvedType,
          validators: {},
          deprecated: false,
        };

        this.current.AddReferenceType(referenceType);

        return uniqueName;
      }

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

  private *calcMemberJsDocProperties(arg: ts.PropertySignatureDeclaration): ts.Op<string> {
    const def = TypeResolver.getDefault(arg);
    const isDeprecated = isExistJSDocTag(arg, tag => tag.tagName.text === 'deprecated') || isDecorator(arg, identifier => identifier.text === 'Deprecated');

    const symbol = yield* this.getSymbolAtLocation(arg.name as ts.Node);
    const description = symbol && (yield* getSymbolDocumentation(symbol, this.current.typeChecker));

    const validators = getPropertyValidators(arg);
    const format = this.getNodeFormat(arg);
    const example = yield* this.getNodeExample(arg);
    const extensions = yield* this.getNodeExtension(arg);
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
  private *calcTypeName(arg: ts.TypeNode): ts.Op<string> {
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
    const names = (types: readonly ts.TypeNode[]) => ts.map(types, type => this.calcTypeName(type));
    if (ts.isTypeReferenceNode(arg) || ts.isExpressionWithTypeArguments(arg)) {
      return (yield* this.calcTypeReferenceTypeName(arg))[1];
    } else if (ts.isTypeLiteralNode(arg)) {
      const members = yield* ts.map(
        arg.members,
        function* (this: TypeResolver, member: ts.TypeElement): ts.Op<string> {
          if (ts.isPropertySignatureDeclaration(member)) {
            const name = (member.name as ts.Identifier).text;
            const typeText = yield* this.calcTypeName(member.type as ts.TypeNode);
            return `"${name}"${ts.hasQuestionToken(member) ? '?' : ''}${yield* this.calcMemberJsDocProperties(member)}: ${typeText}`;
          } else if (ts.isIndexSignatureDeclaration(member)) {
            throwUnless(member.parameters.length === 1, new GenerateMetadataError(`Index signature parameters length != 1`, member));

            const indexType = member.parameters[0];
            throwUnless(
              // now we can't reach this part of code
              ts.isParameterDeclaration(indexType),
              new GenerateMetadataError(`indexSignature declaration parameter kind is not SyntaxKind.Parameter`, indexType),
            );
            throwUnless(!indexType.questionToken, new GenerateMetadataError(`Question token has found for an indexSignature declaration`, indexType));

            const typeText = yield* this.calcTypeName(member.type);
            const indexName = (indexType.name as ts.Identifier).text;
            const indexTypeText = yield* this.calcTypeName(indexType.type as ts.TypeNode);
            return `["${indexName}": ${indexTypeText}]: ${typeText}`;
          }
          throw new GenerateMetadataError(`Unhandled member kind has found: ${member.kind}`, member);
        }.bind(this),
      );
      return `{${members.join('; ')}}`;
    } else if (ts.isArrayTypeNode(arg)) {
      const typeName = yield* this.calcTypeName(arg.elementType);
      return `${typeName}[]`;
    } else if (ts.isIntersectionTypeNode(arg)) {
      return (yield* names(arg.types)).join(' & ');
    } else if (ts.isUnionTypeNode(arg)) {
      return (yield* names(arg.types)).join(' | ');
    } else if (ts.isTypeOperatorNode(arg)) {
      const subTypeName = yield* this.calcTypeName(arg.type);
      if (arg.operator === ts.SyntaxKind.KeyOfKeyword) {
        return `keyof ${subTypeName}`;
      } else if (arg.operator === ts.SyntaxKind.ReadonlyKeyword) {
        return `readonly ${subTypeName}`;
      }
      throw new GenerateMetadataError(`Unknown keyword has found: ${arg.operator}`, arg);
    } else if (ts.isTypeQueryNode(arg)) {
      const subTypeName = yield* this.calcRefTypeName(arg.exprName);
      return `typeof ${subTypeName}`;
    } else if (ts.isIndexedAccessTypeNode(arg)) {
      const [objectTypeName, indexTypeName] = yield* names([arg.objectType, arg.indexType]);
      return `${objectTypeName}[${indexTypeName}]`;
    } else if (arg.kind === ts.SyntaxKind.UnknownKeyword) {
      return 'unknown';
    } else if (arg.kind === ts.SyntaxKind.AnyKeyword) {
      return 'any';
    } else if (arg.kind === ts.SyntaxKind.NeverKeyword) {
      return 'never';
    } else if (ts.isConditionalTypeNode(arg)) {
      const [checkTypeName, extendsTypeName, trueTypeName, falseTypeName] = yield* names([arg.checkType, arg.extendsType, arg.trueType, arg.falseType]);
      return `${checkTypeName} extends ${extendsTypeName} ? ${trueTypeName} : ${falseTypeName}`;
    } else if (ts.isParenthesizedTypeNode(arg)) {
      const internalTypeName = yield* this.calcTypeName(arg.type);
      return `(${internalTypeName})`; //Parentheses are not really interesting. The type name generation adds parentheses for the clarity
    }

    const warning = new GenerateMetaDataWarning(`This kind (${arg.kind}) is unhandled, so the type will be any, and no type conflict checks will made`, arg);

    console.warn(warning.toString());
    return 'any';
  }

  //Generates type name for type references
  private *calcTypeReferenceTypeName(node: TypeReferenceType): ts.Op<[ts.EntityName, string]> {
    const type = TypeResolver.typeReferenceToEntityName(node);
    const refTypeName = yield* this.calcRefTypeName(type);
    if (Array.isArray(node.typeArguments)) {
      // Add typeArguments for Synthetic nodes (e.g. Record<> in TestClassModel.indexedResponse)
      const argumentsString = yield* ts.map(node.typeArguments as readonly ts.TypeNode[], type => this.calcTypeName(type));
      return [type, `${refTypeName}<${argumentsString.join(', ')}>`];
    }
    return [type, refTypeName];
  }

  private *getReferenceType(node: TypeReferenceType, addToRefTypeMap = true): ts.Op<Tsoa.ReferenceType> {
    const [type, name] = yield* this.calcTypeReferenceTypeName(node);
    const refTypeName = this.getRefTypeName(name);
    this.current.CheckExpressionUnicity(refTypeName, name);

    this.context = yield* this.typeArgumentsToContext(node, type);

    const result = yield* this.calcReferenceType(node, type, name, refTypeName);
    if (addToRefTypeMap) {
      this.current.AddReferenceType(result);
    }
    return result;
  }

  private *calcReferenceType(node: TypeReferenceType, type: ts.EntityName, name: string, refTypeName: string): ts.Op<Tsoa.ReferenceType> {
    for (let round = 0; ; round++) {
      const existingType = localReferenceTypeCache[name];
      if (existingType) {
        return existingType;
      }
      if (!inProgressTypes[name]) {
        break;
      }
      // The type is part of its own definition, here or through a branch that waits for this one: it gets a placeholder that is filled in once resolved.
      if (this.ancestors.has(name) || waitsFor(name, this.ancestors) || round >= maxWaitRounds) {
        return this.createCircularDependencyResolver(name, refTypeName);
      }
      // Another branch is resolving the type: wait for it rather than reading its unfinished result.
      addWaits(this.ancestors, name, 1);
      try {
        yield* ts.nextRound();
      } finally {
        addWaits(this.ancestors, name, -1);
      }
    }

    inProgressTypes[name] = [];
    const resolver = this.resolvingReference(name);
    try {
      const declarations = yield* resolver.getModelTypeDeclarations(type);
      const referenceTypes: Tsoa.ReferenceType[] = [];

      // If no declarations found, this might be a built-in type or a type that can't be resolved
      if (declarations.length === 0) {
        // For complex generic types with object literal type arguments,
        // we need to handle them differently
        throw new GenerateMetadataError(`Could not find declarations for type '${name}'. This might be a complex generic type that needs special handling.`);
      }

      for (const declaration of declarations) {
        if (ts.isTypeAliasDeclaration(declaration)) {
          const referencer = isSynthetic(node)
            ? yield* syntheticType(this.current.typeChecker, node)
            : ts.isTypeReferenceNode(node)
              ? yield* this.current.typeChecker.getTypeFromTypeNode.gen(node)
              : yield* this.current.typeChecker.getTypeAtLocation.gen(node);
          referenceTypes.push(yield* new ReferenceTransformer().transform(declaration, refTypeName, resolver, referencer));
        } else if (EnumTransformer.transformable(declaration)) {
          referenceTypes.push(yield* new EnumTransformer().transform(resolver, declaration, refTypeName));
        } else {
          referenceTypes.push(yield* resolver.getModelReference(declaration, refTypeName));
        }
      }
      const referenceType = ReferenceTransformer.merge(referenceTypes);
      this.addToLocalReferenceTypeCache(name, referenceType);
      return referenceType;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`There was a problem resolving type of '${name}'.`);
      // Branches waiting for this type resolve it themselves.
      delete inProgressTypes[name];
      throw err;
    }
  }

  private addToLocalReferenceTypeCache(name: string, refType: Tsoa.ReferenceType) {
    if (inProgressTypes[name]) {
      for (const fn of inProgressTypes[name]) {
        fn(refType);
      }
    }
    localReferenceTypeCache[name] = refType;

    delete inProgressTypes[name];
  }

  private *getModelReference(modelType: ts.InterfaceDeclaration | ts.ClassDeclaration, refTypeName: string): ts.Op<Tsoa.ReferenceType> {
    const example = yield* this.getNodeExample(modelType);
    const description = yield* this.getNodeDescription(modelType);
    const deprecated = isExistJSDocTag(modelType, tag => tag.tagName.text === 'deprecated') || isDecorator(modelType, identifier => identifier.text === 'Deprecated');
    const title = this.getNodeTitle(modelType);

    // Handle toJSON methods
    throwUnless(modelType.name, new GenerateMetadataError("Can't get Symbol from anonymous class", modelType));

    const type = yield* this.current.typeChecker.getTypeAtLocation.gen(modelType.name);
    const toJSON = yield* this.current.typeChecker.getPropertyOfType.gen(type, 'toJSON');
    const toJSONDeclaration = toJSON && (yield* ts.getValueDeclaration(toJSON));
    if (toJSONDeclaration && (ts.isMethodDeclaration(toJSONDeclaration) || ts.isMethodSignatureDeclaration(toJSONDeclaration))) {
      let nodeType = toJSONDeclaration.type;
      if (!nodeType) {
        const signature = yield* this.current.typeChecker.getSignatureFromDeclaration.gen(toJSONDeclaration);
        const implicitType = yield* this.current.typeChecker.getReturnTypeOfSignature.gen(signature);
        nodeType = yield* printType(this.current.typeChecker, implicitType);
        throwUnless(nodeType, new GenerateMetadataError(`Could not print the return type of toJSON`, toJSONDeclaration));
      }
      const type = yield* new TypeResolver(nodeType, this.current, undefined, undefined, undefined, undefined, this.ancestors).resolve();
      const referenceType: Tsoa.ReferenceType = {
        refName: refTypeName,
        dataType: 'refAlias',
        description,
        type,
        validators: {},
        deprecated,
        ...(example !== undefined && { example }),
        ...(title && { title }),
      };
      return referenceType;
    }

    const properties = yield* new PropertyTransformer().transform(this, modelType);
    const additionalProperties = yield* this.getModelAdditionalProperties(modelType);
    const inheritedProperties = (yield* this.getModelInheritedProperties(modelType)) || [];

    const referenceType: Tsoa.ReferenceType & { properties: Tsoa.Property[] } = {
      additionalProperties,
      dataType: 'refObject',
      description,
      properties: inheritedProperties,
      refName: refTypeName,
      deprecated,
      ...(example !== undefined && { example }),
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

  private createCircularDependencyResolver(refName: string, refTypeName: string) {
    const referenceType = {
      dataType: 'refObject',
      refName: refTypeName,
    } as Tsoa.ReferenceType;

    inProgressTypes[refName].push(realReferenceType => {
      for (const key of Object.keys(realReferenceType)) {
        (referenceType as any)[key] = (realReferenceType as any)[key];
      }
    });
    return referenceType;
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

  private *getModelTypeDeclarations(type: ts.EntityName): ts.Op<UsableDeclarationWithoutPropertySignature[]> {
    let typeName: string = type.kind === ts.SyntaxKind.Identifier ? type.text : type.right.text;

    let symbol: ts.Symbol | undefined = yield* this.getSymbolAtLocation(type);
    if (!symbol && type.kind === ts.SyntaxKind.QualifiedName) {
      const fullEnumSymbol = yield* this.getSymbolAtLocation(type.left);
      symbol = fullEnumSymbol && (yield* fullEnumSymbol.getExports.gen()).get(typeName as ts.__String);
    }

    // Handle built-in types that don't have declarations in user code
    if (!symbol) {
      return [];
    }

    const declarations = yield* ts.getDeclarations(symbol);
    if (declarations.length === 0) {
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
      const isLibrary = yield* ts.map(modelTypes, modelType => this.current.isDefaultLibraryFile(modelType.getSourceFile()));
      const nonLibModelTypes = modelTypes.filter((_, index) => !isLibrary[index]);
      // ES2022 adds cause to Error in a second library declaration.
      const keepLibDeclarations = nonLibModelTypes.length === 0 && typeName === 'Error';
      if (!keepLibDeclarations) {
        modelTypes = nonLibModelTypes;
      }

      modelTypes = this.getDesignatedModels(modelTypes, typeName);
    }

    return modelTypes;
  }

  private *getSymbolAtLocation(type: ts.Node): ts.Op<ts.Symbol | undefined> {
    const checker = this.current.typeChecker;
    return yield* ts.memo(
      symbolsAtLocation,
      type,
      function* (this: TypeResolver): ts.Op<ts.Symbol | undefined> {
        const symbol = isSynthetic(type) ? yield* syntheticSymbol(checker, type) : yield* checker.getSymbolAtLocation.gen(type);
        // resolve alias if it is an alias, otherwise take symbol directly
        return (symbol && this.hasFlag(symbol, ts.SymbolFlags.Alias) && (yield* checker.getAliasedSymbol.gen(symbol))) || symbol;
      }.bind(this),
    );
  }

  private *getModelAdditionalProperties(node: UsableDeclaration): ts.Op<Tsoa.Type | undefined> {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const interfaceDeclaration = node;
      const indexMember = interfaceDeclaration.members.find(member => member.kind === ts.SyntaxKind.IndexSignature);
      if (!indexMember) {
        return undefined;
      }

      const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
      const indexType = yield* new TypeResolver(
        indexSignatureDeclaration.parameters[0].type as ts.TypeNode,
        this.current,
        this.parentNode,
        this.context,
        undefined,
        undefined,
        this.ancestors,
      ).resolve();
      throwUnless(indexType.dataType === 'string', new GenerateMetadataError(`Only string indexers are supported.`, this.typeNode));

      return yield* new TypeResolver(indexSignatureDeclaration.type, this.current, this.parentNode, this.context, undefined, undefined, this.ancestors).resolve();
    }

    return undefined;
  }

  private *typeArgumentsToContext(type: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments, targetEntity: ts.EntityName): ts.Op<Context> {
    let newContext: Context = {};

    // Handle cases where targetEntity might be an inline object type
    // Inline object types don't have declarations, so we need to handle them differently
    let declarations;
    try {
      declarations = yield* this.getModelTypeDeclarations(targetEntity);
    } catch (error) {
      // If we can't get declarations (e.g., inline object type),
      // we can't process type parameters, so return empty context
      return newContext;
    }

    const typeParameters = declarations[0] && 'typeParameters' in declarations[0] ? declarations[0].typeParameters : undefined;

    if (typeParameters) {
      for (let index = 0; index < typeParameters.length; index++) {
        const typeParameter = typeParameters[index];
        const typeArg = type.typeArguments && type.typeArguments[index];
        let resolvedType: ts.TypeNode;
        let name: string | undefined;
        // Argument may be a forward reference from context
        if (typeArg && ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName) && this.context[typeArg.typeName.text]) {
          resolvedType = this.context[typeArg.typeName.text].type;
          name = this.context[typeArg.typeName.text].name;
        } else if (typeArg) {
          resolvedType = typeArg;
        } else if (typeParameter.defaultType) {
          resolvedType = typeParameter.defaultType;
        } else {
          throw new GenerateMetadataError(`Could not find a value for type parameter ${typeParameter.name.text}`, type);
        }

        newContext = {
          ...newContext,
          [typeParameter.name.text]: {
            type: resolvedType,
            name: name || (yield* this.calcTypeName(resolvedType)),
          },
        };
      }
    }
    return newContext;
  }

  private *getModelInheritedProperties(modelTypeDeclaration: Exclude<UsableDeclaration, ts.PropertySignatureDeclaration | ts.TypeAliasDeclaration | ts.EnumMember>): ts.Op<Tsoa.Property[]> {
    let properties: Tsoa.Property[] = [];

    const heritageClauses = modelTypeDeclaration.heritageClauses;
    if (!heritageClauses) {
      return properties;
    }

    for (const clause of heritageClauses) {
      if (!clause.types) {
        continue;
      }

      for (const t of clause.types) {
        const baseEntityName = (ts.isTypeReferenceNode(t) ? t.typeName : t.expression) as ts.EntityName;

        // create subContext
        const resetCtx = this.context;
        this.context = yield* this.typeArgumentsToContext(t, baseEntityName);

        const referenceType = yield* this.getReferenceType(t, false);
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

        // reset subContext
        this.context = resetCtx;
      }
    }

    return properties;
  }

  public *getNodeDescription(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration): ts.Op<string | undefined> {
    const symbol = yield* this.getSymbolAtLocation(node.name as ts.Node);
    if (!symbol) {
      return undefined;
    }

    return yield* getSymbolDocumentation(symbol, this.current.typeChecker);
  }

  public getNodeFormat(node: ts.Node) {
    return getJSDocComment(node, 'format');
  }

  public getNodeTitle(node: ts.Node) {
    return getJSDocComment(node, 'title');
  }

  public *getPropertyName(prop: ts.PropertySignatureDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration): ts.Op<string> {
    if (ts.isComputedPropertyName(prop.name) && ts.isPropertyAccessExpression(prop.name.expression)) {
      const initializerValue = yield* getInitializerValue(prop.name.expression, this.current.typeChecker);
      if (initializerValue) {
        return initializerValue?.toString();
      }
    }
    return (prop.name as ts.Identifier).text;
  }

  public *getNodeExample(node: ts.Node): ts.Op<any> {
    const exampleJSDoc = getJSDocComment(node, 'example');
    if (exampleJSDoc) {
      return safeFromJson(exampleJSDoc);
    }

    return yield* getNodeFirstDecoratorValue(node, this.current.typeChecker, dec => dec.text === 'Example');
  }

  public *getNodeExtension(node: ts.Node): ts.Op<Tsoa.Extension[]> {
    const decorators = this.getDecoratorsByIdentifier(node, 'Extension');
    const extensionDecorator = yield* getExtensions(decorators, this.current);

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
