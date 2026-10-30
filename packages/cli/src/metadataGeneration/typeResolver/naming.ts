import * as ts from '../../compiler/index';
import { isDecorator } from '../../utils/decoratorUtils';
import { getJSDocTagNames, isExistJSDocTag } from '../../utils/jsDocUtils';
import { throwUnless } from '../../utils/flowUtils';
import { getPropertyValidators } from '../../utils/validatorUtils';
import { GenerateMetadataError } from '../exceptions';
import type { MetadataGenerator } from '../metadataGenerator';
import { PrimitiveTransformer } from '../transformer/primitiveTransformer';
import { nodeDefault, nodeDescription, nodeExample, nodeExtensions, nodeFormat } from './annotations';
import { modelDeclarations, type ModelDeclaration } from './declarations';
import type { Substitutions } from './site';

export interface ReferenceName {
  entity: ts.EntityName;
  /** The name spelled from the written type expression, e.g. `Omit<User, 'id'>`. */
  typeName: string;
  /** The component name derived from `typeName`, e.g. `Omit_User.id_`. */
  refName: string;
  declarations: ModelDeclaration[];
}

/**
 * Model naming. Names are part of the public contract (component names in generated specs), so
 * every type the previous resolver could name keeps its spelling, including the quirks. Type
 * arguments it named `any` (template literal types, tuples and other syntax it did not handle)
 * now get their own names, e.g. `Box<[string, number]>` becomes `Box__string.number__` rather
 * than `Box_any_`, so distinct instantiations no longer collapse into one model. Names depend on
 * how a type is written, not on what it resolves to.
 */
export class TypeNamer {
  constructor(private readonly generator: MetadataGenerator) {}

  private get checker() {
    return this.generator.typeChecker;
  }

  /** Names a written reference and finds its declarations. */
  public referenceName(node: ts.TypeReferenceType, subs: Substitutions): ReferenceName {
    const entity = entityOf(node);
    const name = this.refTypeName(entity, subs);
    const typeName = this.withTypeArguments(node, name, subs);
    const refName = TypeNamer.refName(typeName);
    this.generator.CheckExpressionUnicity(refName, typeName);
    return { entity, typeName, refName, declarations: modelDeclarations(this.checker, entity) };
  }

  /** The written type expression, normalized. */
  public typeName(arg: ts.TypeNode, subs: Substitutions): string {
    if (ts.isLiteralTypeNode(arg)) {
      const literalValue = literalValueOf(arg);
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
    const primitive = PrimitiveTransformer.resolveKindToPrimitive(arg.kind);
    if (primitive) {
      return primitive;
    }
    if (ts.isTypeReferenceNode(arg) || ts.isExpressionWithTypeArguments(arg)) {
      return this.withTypeArguments(arg, this.refTypeName(entityOf(arg), subs), subs);
    }
    if (ts.isTypeLiteralNode(arg)) {
      return `{${arg.members.map(member => this.memberName(member, subs)).join('; ')}}`;
    }
    if (ts.isArrayTypeNode(arg)) {
      return `${this.typeName(arg.elementType, subs)}[]`;
    }
    if (ts.isIntersectionTypeNode(arg)) {
      return arg.types.map(type => this.typeName(type, subs)).join(' & ');
    }
    if (ts.isUnionTypeNode(arg)) {
      return arg.types.map(type => this.typeName(type, subs)).join(' | ');
    }
    if (ts.isTypeOperatorNode(arg)) {
      const subTypeName = this.typeName(arg.type, subs);
      if (arg.operator === ts.SyntaxKind.KeyOfKeyword) {
        return `keyof ${subTypeName}`;
      }
      if (arg.operator === ts.SyntaxKind.ReadonlyKeyword) {
        return `readonly ${subTypeName}`;
      }
      throw new GenerateMetadataError(`Unknown keyword has found: ${arg.operator}`, arg);
    }
    if (ts.isTypeQueryNode(arg)) {
      return `typeof ${this.refTypeName(arg.exprName, subs)}`;
    }
    if (ts.isIndexedAccessTypeNode(arg)) {
      return `${this.typeName(arg.objectType, subs)}[${this.typeName(arg.indexType, subs)}]`;
    }
    if (arg.kind === ts.SyntaxKind.UnknownKeyword) {
      return 'unknown';
    }
    if (arg.kind === ts.SyntaxKind.AnyKeyword) {
      return 'any';
    }
    if (arg.kind === ts.SyntaxKind.NeverKeyword) {
      return 'never';
    }
    if (ts.isConditionalTypeNode(arg)) {
      const parts = [arg.checkType, arg.extendsType, arg.trueType, arg.falseType].map(type => this.typeName(type, subs));
      return `${parts[0]} extends ${parts[1]} ? ${parts[2]} : ${parts[3]}`;
    }
    if (ts.isParenthesizedTypeNode(arg)) {
      // Parentheses are kept; existing component names depend on them.
      return `(${this.typeName(arg.type, subs)})`;
    }
    if (ts.isTemplateLiteralTypeNode(arg)) {
      return `\`${arg.head.text}${arg.templateSpans.map(span => `\${${this.typeName(span.type, subs)}}${span.literal.text}`).join('')}\``;
    }
    if (ts.isTupleTypeNode(arg)) {
      // Brackets are written as `_`, like the other delimiters in component names.
      return `_${arg.elements.map(element => this.typeName(element, subs)).join(', ')}_`;
    }
    if (ts.isNamedTupleMember(arg)) {
      return `${arg.dotDotDotToken ? '...' : ''}${this.typeName(arg.type, subs)}${arg.questionToken ? '?' : ''}`;
    }
    if (ts.isRestTypeNode(arg)) {
      return `...${this.typeName(arg.type, subs)}`;
    }
    if (ts.isOptionalTypeNode(arg)) {
      return `${this.typeName(arg.type, subs)}?`;
    }
    // Any other syntax is named by its written text, so different types never share a name.
    return printed(arg);
  }

  /** Turns a type name into a component name accepted by Swagger UI. */
  public static refName(name: string): string {
    const preformattedName = name
      .replace(/<|>/g, '_')
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .replace(/'([^']*)'/g, '$1')
      .replace(/"([^"]*)"/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\$\{/g, '{')
      .replace(/&/g, '-and-')
      .replace(/\|/g, '-or-')
      .replace(/\[\]/g, '-Array')
      .replace(/{|}/g, '_')
      .replace(/([a-z_0-9]+\??):([a-z]+)/gi, '$1-$2')
      .replace(/;/g, '--')
      .replace(/([a-z})\]])\[([a-z]+)\]/gi, '$1-at-$2');

    const formattedName = preformattedName.replace(/[^A-Za-z0-9\-._]/g, match => `_${match.charCodeAt(0)}_`);
    // Windows uses \r\n, but linux uses \n.
    return formattedName.replace(/92_r_92_n/g, '92_n');
  }

  /** Appends written type arguments. */
  private withTypeArguments(node: ts.TypeReferenceType, name: string, subs: Substitutions): string {
    if (Array.isArray(node.typeArguments)) {
      return `${name}<${node.typeArguments.map(type => this.typeName(type, subs)).join(', ')}>`;
    }
    return name;
  }

  /** The declared name, prefixed with its namespaces. */
  private refTypeName(entity: ts.EntityName, subs: Substitutions): string {
    let name = entityText(entity);
    const substitution = subs.get(name);
    if (substitution) {
      return substitution.name;
    }

    const declarations = modelDeclarations(this.checker, entity);
    if (declarations.length === 0) {
      if (ts.isIdentifier(entity)) {
        return entity.text;
      }
      // A qualified reference without declarations (an unresolved namespace member).
      return 'Inline_any';
    }

    // Every declaration is in the same namespace hierarchy.
    const oneDeclaration = declarations[0];
    const identifiers = name.split('.');
    name = identifiers.slice(identifiers.length - (ts.isEnumMember(oneDeclaration) ? 2 : 1)).join('.');

    let actNode = oneDeclaration.parent;
    let isFirst = true;
    const isGlobalDeclaration = (mod: ts.ModuleDeclaration) => mod.name.kind === ts.SyntaxKind.Identifier && mod.name.text === 'global';
    while (!ts.isSourceFile(actNode)) {
      if (ts.isBlock(actNode)) {
        break;
      }
      if (!(isFirst && ts.isEnumDeclaration(actNode)) && !ts.isModuleBlock(actNode)) {
        throwUnless(ts.isModuleDeclaration(actNode), new GenerateMetadataError(`This node kind is unknown: ${actNode.kind}`, entity));
        if (!isGlobalDeclaration(actNode)) {
          name = `${actNode.name.text}.${name}`;
        }
      }
      isFirst = false;
      actNode = actNode.parent;
    }

    this.generator.CheckModelUnicity(
      name,
      declarations.map(declaration => ({ fileName: declaration.getSourceFile().fileName, pos: declaration.pos })),
    );
    return name;
  }

  /** One member of a type literal, including its JSDoc annotations. */
  private memberName(member: ts.TypeElement, subs: Substitutions): string {
    if (ts.isPropertySignature(member)) {
      const name = (member.name as ts.Identifier).text;
      return `"${name}"${member.questionToken ? '?' : ''}${this.memberJsDoc(member)}: ${this.typeName(member.type as ts.TypeNode, subs)}`;
    }
    if (ts.isIndexSignatureDeclaration(member)) {
      throwUnless(member.parameters.length === 1, new GenerateMetadataError(`Index signature parameters length != 1`, member));
      const indexType = member.parameters[0];
      throwUnless(ts.isParameter(indexType), new GenerateMetadataError(`indexSignature declaration parameter kind is not SyntaxKind.Parameter`, indexType));
      throwUnless(!indexType.questionToken, new GenerateMetadataError(`Question token has found for an indexSignature declaration`, indexType));
      const indexName = (indexType.name as ts.Identifier).text;
      return `["${indexName}": ${this.typeName(indexType.type as ts.TypeNode, subs)}]: ${this.typeName(member.type, subs)}`;
    }
    throw new GenerateMetadataError(`Unhandled member kind has found: ${member.kind}`, member);
  }

  private memberJsDoc(arg: ts.PropertySignature): string {
    const validators = getPropertyValidators(arg);
    const extensions = nodeExtensions(this.generator, arg);
    const example = nodeExample(this.checker, arg);
    const jsonObj: Record<string, unknown> = {
      default: nodeDefault(arg),
      description: nodeDescription(this.checker, arg.name),
      validators: validators && Object.keys(validators).length ? validators : undefined,
      format: nodeFormat(arg),
      example: example !== undefined ? example : undefined,
      extensions: extensions.length ? extensions : undefined,
      deprecated: isExistJSDocTag(arg, tag => tag.tagName.text === 'deprecated') || isDecorator(arg, identifier => identifier.text === 'Deprecated') ? true : undefined,
      ignored: getJSDocTagNames(arg).some(tag => tag === 'ignore') ? true : undefined,
    };
    for (const key of Object.keys(jsonObj)) {
      if (jsonObj[key] === undefined) {
        delete jsonObj[key];
      }
    }
    return Object.keys(jsonObj).length ? JSON.stringify(jsonObj) : '';
  }
}

export function entityOf(node: ts.TypeReferenceType): ts.EntityName {
  if (ts.isTypeReferenceNode(node)) {
    return node.typeName;
  }
  if (ts.isExpressionWithTypeArguments(node)) {
    return node.expression as ts.EntityName;
  }
  throw new GenerateMetadataError(`Can't resolve Reference type.`);
}

function entityText(entity: ts.EntityName): string {
  return ts.isIdentifier(entity) ? entity.text : `${entityText(entity.left)}.${entity.right.text}`;
}

/** The written text of a type node (printed, so synthesized nodes have one too). */
function printed(node: ts.TypeNode): string {
  return ts.printNode(node);
}

/** The value of a literal type node. */
export function literalValueOf(typeNode: ts.LiteralTypeNode): string | number | boolean | null {
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
      throwUnless((typeNode.literal as ts.PrefixUnaryExpression).operator === ts.SyntaxKind.MinusToken, new GenerateMetadataError(`Couldn't resolve literal node: ${typeNode.literal.getText()}`));
      return parseFloat(typeNode.literal.getText());
    case ts.SyntaxKind.NullKeyword:
      return null;
    default:
      throwUnless(Object.prototype.hasOwnProperty.call(typeNode.literal, 'text'), new GenerateMetadataError(`Couldn't resolve literal node: ${typeNode.literal.getText()}`));
      return typeNode.literal.text;
  }
}
