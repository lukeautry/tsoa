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

const localReferenceTypeCache: { [typeName: string]: Tsoa.ReferenceType } = {};
const inProgressTypes: { [typeName: string]: Array<(realType: Tsoa.ReferenceType) => void> } = {};

type UsableDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.PropertySignature | ts.TypeAliasDeclaration | ts.EnumMember;
type UsableDeclarationWithoutPropertySignature = Exclude<UsableDeclaration, ts.PropertySignature>;
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
  ) {}

  public static clearCache() {
    Object.keys(localReferenceTypeCache).forEach(key => {
      delete localReferenceTypeCache[key];
    });

    Object.keys(inProgressTypes).forEach(key => {
      delete inProgressTypes[key];
    });
  }

  public resolve(): Tsoa.Type {
    const primitiveType = new PrimitiveTransformer(this).transform(this.typeNode, this.parentNode);
    if (primitiveType) {
      return primitiveType;
    }

    if (this.typeNode.kind === ts.SyntaxKind.NullKeyword) {
      return EnumTransformer.transformEnum([null]);
    }

    if (this.typeNode.kind === ts.SyntaxKind.UndefinedKeyword) {
      const undefinedType: Tsoa.UndefinedType = {
        dataType: 'undefined',
      };
      return undefinedType;
    }

    if (ts.isArrayTypeNode(this.typeNode)) {
      const arrayMetaType: Tsoa.ArrayType = {
        dataType: 'array',
        elementType: new TypeResolver(this.typeNode.elementType, this.current, this.parentNode, this.context).resolve(),
      };
      return arrayMetaType;
    }

    if (ts.isUnionTypeNode(this.typeNode)) {
      const types = this.typeNode.types.map(type => {
        return new TypeResolver(type, this.current, this.parentNode, this.context).resolve();
      });

      const unionMetaType: Tsoa.UnionType = {
        dataType: 'union',
        types,
      };
      return unionMetaType;
    }

    if (ts.isIntersectionTypeNode(this.typeNode)) {
      const types = this.typeNode.types.map(type => {
        return new TypeResolver(type, this.current, this.parentNode, this.context).resolve();
      });

      const intersectionMetaType: Tsoa.IntersectionType = {
        dataType: 'intersection',
        types,
      };

      return intersectionMetaType;
    }

    if (this.typeNode.kind === ts.SyntaxKind.AnyKeyword || this.typeNode.kind === ts.SyntaxKind.UnknownKeyword) {
      const literallyAny: Tsoa.AnyType = {
        dataType: 'any',
      };
      return literallyAny;
    }

    if (ts.isLiteralTypeNode(this.typeNode)) {
      return EnumTransformer.transformEnum([this.getLiteralValue(this.typeNode)]);
    }

    if (ts.isTypeLiteralNode(this.typeNode)) {
      const properties = this.typeNode.members
        .filter(ts.isPropertySignature)
        .reduce<Tsoa.Property[]>(
          (res, signature: ts.PropertySignature) => [new PropertyTransformer(this).transformFromSignature(signature), ...res],
          [],
        );

      const indexMember = this.typeNode.members.find(member => ts.isIndexSignatureDeclaration(member));
      let additionalType: Tsoa.Type | undefined;

      if (indexMember) {
        const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
        const indexType = new TypeResolver(indexSignatureDeclaration.parameters[0].type as ts.TypeNode, this.current, this.parentNode, this.context).resolve();

        throwUnless(
          indexType.dataType === 'string',
          new GenerateMetadataError(`Only string indexers are supported.`, this.typeNode),
        );

        additionalType = new TypeResolver(indexSignatureDeclaration.type, this.current, this.parentNode, this.context).resolve();
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
        if (this.hasFlag(type, ts.TypeFlags.Union)) {
          //Intersections are not interesting somehow...
          const types = (type as ts.UnionType).types;
          const resolvedTypes = types.map(calcMappedType);
          return {
            dataType: 'union',
            types: resolvedTypes,
          };
        } else if (this.hasFlag(type, ts.TypeFlags.Undefined)) {
          return {
            dataType: 'undefined',
          };
        } else if (this.hasFlag(type, ts.TypeFlags.Null)) {
          return EnumTransformer.transformEnum([null]);
        } else if (this.hasFlag(type, ts.TypeFlags.Object)) {
          const typeProperties: ts.Symbol[] = type.getProperties();
          const properties: Tsoa.Property[] = typeProperties
            // Ignore methods, getter, setter and @ignored props
            .filter(property => isIgnored(property) === false)
            // Transform to property
            .map(property => {
              const propertyType = this.current.typeChecker.getTypeOfSymbolAtLocation(property, this.typeNode);

              const typeNode = this.current.typeChecker.typeToTypeNode(propertyType, undefined, ts.NodeBuilderFlags.NoTruncation)!;
              const parent = getOneOrigDeclaration(property); //If there are more declarations, we need to get one of them, from where we want to recognize jsDoc
              const type = new TypeResolver(typeNode, this.current, parent, this.context, propertyType).resolve();

              const required = !(this.hasFlag(property, ts.SymbolFlags.Optional));

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
            const typeNode = this.current.typeChecker.typeToTypeNode(indexInfo.type, undefined, ts.NodeBuilderFlags.NoTruncation)!;
            if (typeNode.kind === ts.SyntaxKind.NeverKeyword) {
              // { [k: string]: never; }
              return [];
            }
            const type = new TypeResolver(typeNode, this.current, mappedTypeNode, this.context, indexInfo.type).resolve();
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

      const referencer = this.getReferencer();
      const result: Tsoa.Type = calcMappedType(referencer);
      return result;
    }

    if (ts.isConditionalTypeNode(this.typeNode)) {
      const referencer = this.getReferencer();
      const resolvedNode = this.current.typeChecker.typeToTypeNode(referencer, undefined, ts.NodeBuilderFlags.NoTruncation)!;
      return new TypeResolver(resolvedNode, this.current, this.typeNode, this.context, referencer).resolve();
    }

    // keyof & readonly arrays
    if (ts.isTypeOperatorNode(this.typeNode)) {
      return this.resolveTypeOperatorNode(this.typeNode, this.current.typeChecker, this.current, this.context, this.parentNode, this.referencer);
    }

    // Indexed type
    if (ts.isIndexedAccessTypeNode(this.typeNode)) {
      return this.resolveIndexedAccessTypeNode(this.typeNode, this.current.typeChecker, this.current, this.context);
    }

    if (ts.isTemplateLiteralTypeNode(this.typeNode)) {
      const type = this.getReferencer();
      throwUnless(
        type.isUnion() && type.types.every((unionElementType): unionElementType is ts.StringLiteralType => unionElementType.isStringLiteral()),
        new GenerateMetadataError(`Could not the type of ${this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode), this.typeNode)}`, this.typeNode),
      );

      // `a${'c' | 'd'}b`
      return EnumTransformer.transformEnum(
        type.types.map((stringLiteralType: ts.StringLiteralType) => stringLiteralType.value),
      );
    }

    if (ts.isParenthesizedTypeNode(this.typeNode)) {
      return new TypeResolver(this.typeNode.type, this.current, this.typeNode, this.context, this.referencer).resolve();
    }

    throwUnless(
      this.typeNode.kind === ts.SyntaxKind.TypeReference,
      new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[this.typeNode.kind]}`, this.typeNode),
    );

    return this.resolveTypeReferenceNode(this.typeNode as ts.TypeReferenceNode, this.current, this.context, this.parentNode);
  }

  private resolveTypeOperatorNode(
    typeNode: ts.TypeOperatorNode,
    typeChecker: ts.TypeChecker,
    current: MetadataGenerator,
    context: Context,
    parentNode?: ts.Node,
    referencer?: ts.Type,
  ): Tsoa.Type {
    switch (typeNode.operator) {
      case ts.SyntaxKind.KeyOfKeyword: {
        const type = typeChecker.getTypeFromTypeNode(typeNode);
        if (type.isIndexType()) {
          // in case of generic: keyof T. Not handles all possible cases
          const symbol = type.type.getSymbol();
          if (symbol && symbol.getFlags() & ts.TypeFlags.TypeParameter) {
            const typeName = symbol.getEscapedName();
            throwUnless(
              typeof typeName === 'string',
              new GenerateMetadataError(`typeName is not string, but ${typeof typeName}`, typeNode),
            );

            if (context[typeName]) {
              const subResult = new TypeResolver(context[typeName].type, current, parentNode, context).resolve();
              if (subResult.dataType === 'any') {
                return {
                  dataType: 'union',
                  types: [{ dataType: 'string' }, { dataType: 'double' }],
                };
              }
              const properties = (subResult as Tsoa.RefObjectType).properties?.map(v => v.name);
              throwUnless(
                properties,
                new GenerateMetadataError(`TypeOperator 'keyof' on node which have no properties`, context[typeName].type),
              );

              return EnumTransformer.transformEnum(properties);
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
                EnumTransformer.transformEnum(stringMembers),
                EnumTransformer.transformEnum(numberMembers),
              ],
            };
          }
          return EnumTransformer.transformEnum(literalValues);
        } else if (type.isLiteral()) {
          throwUnless(
            typeof type.value == 'number' || typeof type.value == 'string',
            new GenerateMetadataError(`Not handled indexType, maybe ts.PseudoBigInt ${typeChecker.typeToString(type)}`, typeNode),
          );
          return EnumTransformer.transformEnum([type.value]);
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
        return new TypeResolver(typeNode.type, current, typeNode, context, referencer).resolve();
      default:
        throw new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`, typeNode);
    }
  }

  private resolveIndexedAccessTypeNode(typeNode: ts.IndexedAccessTypeNode, typeChecker: ts.TypeChecker, current: MetadataGenerator, context: Context): Tsoa.Type {
    const { indexType, objectType } = typeNode;

    if ([ts.SyntaxKind.NumberKeyword, ts.SyntaxKind.StringKeyword].includes(indexType.kind)) {
      // Indexed by keyword
      const isNumberIndexType = indexType.kind === ts.SyntaxKind.NumberKeyword;
      const typeOfObjectType = typeChecker.getTypeFromTypeNode(objectType);
      const type = isNumberIndexType ? typeOfObjectType.getNumberIndexType() : typeOfObjectType.getStringIndexType();
      throwUnless(
        type,
        new GenerateMetadataError(`Could not determine ${isNumberIndexType ? 'number' : 'string'} index on ${typeChecker.typeToString(typeOfObjectType)}`, typeNode),
      );
      return new TypeResolver(typeChecker.typeToTypeNode(type, objectType, ts.NodeBuilderFlags.NoTruncation)!, current, typeNode, context).resolve();
    } else if (ts.isLiteralTypeNode(indexType) && (ts.isStringLiteral(indexType.literal) || ts.isNumericLiteral(indexType.literal))) {
      // Indexed by literal
      const hasType = (node: ts.Node | undefined): node is ts.HasType => node !== undefined && Object.prototype.hasOwnProperty.call(node, 'type');
      const symbol = typeChecker.getPropertyOfType(typeChecker.getTypeFromTypeNode(objectType), indexType.literal.text);
      throwUnless(
        symbol,
        new GenerateMetadataError(
          `Could not determine the keys on ${typeChecker.typeToString(typeChecker.getTypeFromTypeNode(objectType))}`,
          typeNode,
        ),
      );
      if (hasType(symbol.valueDeclaration) && symbol.valueDeclaration.type) {
        return new TypeResolver(symbol.valueDeclaration.type, current, typeNode, context).resolve();
      }
      const declaration = typeChecker.getTypeOfSymbolAtLocation(symbol, objectType);
      try {
        return new TypeResolver(typeChecker.typeToTypeNode(declaration, objectType, ts.NodeBuilderFlags.NoTruncation)!, current, typeNode, context).resolve();
      } catch {
        throw new GenerateMetadataError(
          `Could not determine the keys on ${typeChecker.typeToString(
            typeChecker.getTypeFromTypeNode(typeChecker.typeToTypeNode(declaration, undefined, ts.NodeBuilderFlags.NoTruncation)!),
          )}`,
          typeNode,
        );
      }
    } else if (ts.isTypeOperatorNode(indexType) && indexType.operator === ts.SyntaxKind.KeyOfKeyword) {
      // Indexed by keyof typeof value
      const typeOfObjectType = ts.isParenthesizedTypeNode(objectType) ? objectType.type : objectType;
      const { type: typeOfIndexType } = indexType;
      const isSameTypeQuery = ts.isTypeQueryNode(typeOfObjectType) && ts.isTypeQueryNode(typeOfIndexType) && typeOfObjectType.exprName.getText() === typeOfIndexType.exprName.getText();
      const isSameTypeReference = ts.isTypeReferenceNode(typeOfObjectType) && ts.isTypeReferenceNode(typeOfIndexType) && typeOfObjectType.typeName.getText() === typeOfIndexType.typeName.getText();
      if (isSameTypeQuery || isSameTypeReference) {
        const type = this.getReferencer();
        const node = typeChecker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias | ts.NodeBuilderFlags.NoTruncation)!;
        return new TypeResolver(node, current, typeNode, context, this.referencer).resolve();
      }
    }
    throw new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`, typeNode);
  }

  private resolveTypeReferenceNode(
    typeNode: ts.TypeReferenceNode,
    current: MetadataGenerator,
    context: Context,
    parentNode?: ts.Node,
  ): Tsoa.Type {
    const { typeName, typeArguments } = typeNode;

    if (typeName.kind !== ts.SyntaxKind.Identifier) {
      return this.getReferenceType(typeNode);
    }

    switch(typeName.text) {
      case 'Date':
        return new DateTransformer(this).transform(parentNode);
      case 'Buffer':
      case 'Readable':
        return { dataType: 'buffer' };
      case 'Array':
        if (typeArguments && typeArguments.length === 1) {
            return {
            dataType: 'array',
            elementType: new TypeResolver(typeArguments[0], current, parentNode, context).resolve(),
          };
        }
        break;
      case 'Promise':
        if (typeArguments && typeArguments.length === 1) {
          return new TypeResolver(typeArguments[0], current, parentNode, context).resolve();
        }
        break;
      case 'String':
        return { dataType: 'string' };
      default:
        if (context[typeName.text]) {
          return new TypeResolver(context[typeName.text].type, current, parentNode, context).resolve();
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
      case ts.SyntaxKind.NullKeyword:
        return null;
      default:
        throwUnless(
          Object.prototype.hasOwnProperty.call(typeNode.literal, 'text'),
          new GenerateMetadataError(`Couldn't resolve literal node: ${typeNode.literal.getText()}`),
        );
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

    throwUnless(
      designatedNodes.length === 1,
      new GenerateMetadataError(`Multiple models for ${typeName} marked with '@tsoaModel'; '@tsoaModel' should only be applied to one model.`),
    );

    return designatedNodes;
  }

  private hasFlag(type: ts.Type | ts.Symbol | ts.Declaration, flag: ts.TypeFlags | ts.NodeFlags | ts.SymbolFlags) {
    return (type.flags & flag) === flag;
  }

  private getReferencer(): ts.Type {
    if (this.referencer) {
      return this.referencer;
    }
    if (this.typeNode.pos !== -1) {
      return this.current.typeChecker.getTypeFromTypeNode(this.typeNode);
    }
    throw new GenerateMetadataError(`Can not succeeded to calculate referencer type.`, this.typeNode);
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
    if (this.context[name]) {
      //resolve name only interesting if entity is not qualifiedName
      name = this.context[name].name; //Not needed to check unicity, because generic parameters are checked previously
    } else {
      const declarations = this.getModelTypeDeclarations(type);

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
      if (ts.isEnumMember(oneDeclaration)) {
        name = identifiers.slice(identifiers.length - 2).join('.');
      } else {
        name = identifiers.slice(identifiers.length - 1).join('.');
      }

      let actNode = oneDeclaration.parent;
      let isFirst = true;
      const isGlobalDeclaration = (mod: ts.ModuleDeclaration) => mod.name.kind === ts.SyntaxKind.Identifier && mod.name.text === 'global';

      while (!ts.isSourceFile(actNode)) {
        if (!(isFirst && ts.isEnumDeclaration(actNode)) && !ts.isModuleBlock(actNode)) {
          throwUnless(
            ts.isModuleDeclaration(actNode),
            new GenerateMetadataError(`This node kind is unknown: ${actNode.kind}`, type),
          );

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

    const symbol = this.getSymbolAtLocation(arg.name as ts.Node);
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
    if (ts.isTypeReferenceNode(arg) || ts.isExpressionWithTypeArguments(arg)) {
      const [_, name] = this.calcTypeReferenceTypeName(arg);
      return name;
    } else if (ts.isTypeLiteralNode(arg)) {
      const members = arg.members.map(member => {
        if (ts.isPropertySignature(member)) {
          const name = (member.name as ts.Identifier).text;
          const typeText = this.calcTypeName(member.type as ts.TypeNode);
          return `"${name}"${member.questionToken ? '?' : ''}${this.calcMemberJsDocProperties(member)}: ${typeText}`;
        } else if (ts.isIndexSignatureDeclaration(member)) {
          throwUnless(
            member.parameters.length === 1,
            new GenerateMetadataError(`Index signature parameters length != 1`, member),
          );

          const indexType = member.parameters[0];
          throwUnless(
            // now we can't reach this part of code
            ts.isParameter(indexType),
            new GenerateMetadataError(`indexSignature declaration parameter kind is not SyntaxKind.Parameter`, indexType),
          );
          throwUnless(
            !indexType.questionToken,
            new GenerateMetadataError(`Question token has found for an indexSignature declaration`, indexType),
          );

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

  private getReferenceType(node: ts.TypeReferenceType, addToRefTypeMap = true): Tsoa.ReferenceType {
    const [type, name] = this.calcTypeReferenceTypeName(node);
    const refTypeName = this.getRefTypeName(name);
    this.current.CheckExpressionUnicity(refTypeName, name);

    this.context = this.typeArgumentsToContext(node, type);

    const calcReferenceType = (): Tsoa.ReferenceType => {
      try {
        const existingType = localReferenceTypeCache[name];
        if (existingType) {
          return existingType;
        }

        if (inProgressTypes[name]) {
          return this.createCircularDependencyResolver(name, refTypeName);
        }

        inProgressTypes[name] = [];

        const declarations = this.getModelTypeDeclarations(type);
        const referenceTypes: Tsoa.ReferenceType[] = [];
        for (const declaration of declarations) {
          if (ts.isTypeAliasDeclaration(declaration)) {
            const referencer = node.pos !== -1 ? this.current.typeChecker.getTypeFromTypeNode(node) : undefined;
            referenceTypes.push(new ReferenceTransformer(this).transform(declaration, refTypeName, referencer));
          } else if (EnumTransformer.isRefTransformable(declaration)) {
            referenceTypes.push(new EnumTransformer(this).transformRef(declaration, refTypeName));
          } else {
            referenceTypes.push(this.getModelReference(declaration, refTypeName));
          }
        }
        const referenceType = ReferenceTransformer.merge(referenceTypes);
        this.addToLocalReferenceTypeCache(name, referenceType);
        return referenceType;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`There was a problem resolving type of '${name}'.`);
        throw err;
      }
    };
    const result = calcReferenceType();
    if (addToRefTypeMap) {
      this.current.AddReferenceType(result);
    }
    return result;
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

  private getModelReference(modelType: ts.InterfaceDeclaration | ts.ClassDeclaration, refTypeName: string) {
    const example = this.getNodeExample(modelType);
    const description = this.getNodeDescription(modelType);
    const deprecated = isExistJSDocTag(modelType, tag => tag.tagName.text === 'deprecated') || isDecorator(modelType, identifier => identifier.text === 'Deprecated');

    // Handle toJSON methods
    throwUnless(
      modelType.name,
      new GenerateMetadataError("Can't get Symbol from anonymous class", modelType),
    );

    const type = this.current.typeChecker.getTypeAtLocation(modelType.name);
    const toJSON = this.current.typeChecker.getPropertyOfType(type, 'toJSON');
    if (toJSON && toJSON.valueDeclaration && (ts.isMethodDeclaration(toJSON.valueDeclaration) || ts.isMethodSignature(toJSON.valueDeclaration))) {
      let nodeType = toJSON.valueDeclaration.type;
      if (!nodeType) {
        const signature = this.current.typeChecker.getSignatureFromDeclaration(toJSON.valueDeclaration);
        const implicitType = this.current.typeChecker.getReturnTypeOfSignature(signature!);
        nodeType = this.current.typeChecker.typeToTypeNode(implicitType, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
      }
      const type = new TypeResolver(nodeType, this.current).resolve();
      const referenceType: Tsoa.ReferenceType = {
        refName: refTypeName,
        dataType: 'refAlias',
        description,
        type,
        validators: {},
        deprecated,
        ...(example && { example }),
      };
      return referenceType;
    }

    const properties = new PropertyTransformer(this).transform(modelType);
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

  private getModelTypeDeclarations(type: ts.EntityName) {
    let typeName: string = type.kind === ts.SyntaxKind.Identifier ? type.text : type.right.text;

    let symbol: ts.Symbol | undefined = this.getSymbolAtLocation(type);
    if (!symbol && type.kind === ts.SyntaxKind.QualifiedName) {
      const fullEnumSymbol = this.getSymbolAtLocation(type.left);
      symbol = fullEnumSymbol.exports?.get(typeName as any);
    }
    const declarations = symbol?.getDeclarations();

    throwUnless(
      symbol && declarations,
      new GenerateMetadataError(`No declarations found for referenced type ${typeName}.`),
    );

    if (symbol.escapedName !== typeName && symbol.escapedName !== 'default') {
      typeName = symbol.escapedName as string;
    }

    let modelTypes = declarations.filter((node): node is UsableDeclarationWithoutPropertySignature => {
      return this.nodeIsUsable(node) && node.name?.getText() === typeName;
    });

    throwUnless(
      modelTypes.length,
      new GenerateMetadataError(`No matching model found for referenced type ${typeName}.`),
    );

    if (modelTypes.length > 1) {
      // remove types that are from typescript e.g. 'Account'
      modelTypes = modelTypes.filter(modelType => {
        return modelType.getSourceFile().fileName.replace(/\\/g, '/').toLowerCase().indexOf('node_modules/typescript') <= -1;
      });

      modelTypes = this.getDesignatedModels(modelTypes, typeName);
    }

    return modelTypes;
  }

  private getSymbolAtLocation(type: ts.Node): ts.Symbol {
    const symbol = this.current.typeChecker.getSymbolAtLocation(type) || ((type as any).symbol as ts.Symbol);
    // resolve alias if it is an alias, otherwise take symbol directly
    return (symbol && this.hasFlag(symbol, ts.SymbolFlags.Alias) && this.current.typeChecker.getAliasedSymbol(symbol)) || symbol;
  }

  private getModelAdditionalProperties(node: UsableDeclaration) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const interfaceDeclaration = node;
      const indexMember = interfaceDeclaration.members.find(member => member.kind === ts.SyntaxKind.IndexSignature);
      if (!indexMember) {
        return undefined;
      }

      const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
      const indexType = new TypeResolver(indexSignatureDeclaration.parameters[0].type as ts.TypeNode, this.current, this.parentNode, this.context).resolve();
      throwUnless(
        indexType.dataType === 'string',
        new GenerateMetadataError(`Only string indexers are supported.`, this.typeNode),
      );

      return new TypeResolver(indexSignatureDeclaration.type, this.current, this.parentNode, this.context).resolve();
    }

    return undefined;
  }

  private typeArgumentsToContext(type: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments, targetEntity: ts.EntityName): Context {
    let newContext: Context = {};

    const declaration = this.getModelTypeDeclarations(targetEntity);
    const typeParameters = 'typeParameters' in declaration[0] ? declaration[0].typeParameters : undefined;

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
        } else if (typeParameter.default) {
          resolvedType = typeParameter.default;
        } else {
          throw new GenerateMetadataError(`Could not find a value for type parameter ${typeParameter.name.text}`, type);
        }

        newContext = {
          ...newContext,
          [typeParameter.name.text]: {
            type: resolvedType,
            name: name || this.calcTypeName(resolvedType),
          },
        };
      }
    }
    return newContext;
  }

  private getModelInheritedProperties(modelTypeDeclaration: Exclude<UsableDeclaration, ts.PropertySignature | ts.TypeAliasDeclaration | ts.EnumMember>): Tsoa.Property[] {
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
        const baseEntityName = t.expression as ts.EntityName;

        // create subContext
        const resetCtx = this.context;
        this.context = this.typeArgumentsToContext(t, baseEntityName);

        const referenceType = this.getReferenceType(t, false);
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
