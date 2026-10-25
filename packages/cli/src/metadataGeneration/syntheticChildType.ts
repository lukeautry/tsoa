import * as ts from 'typescript';

const printer = ts.createPrinter();
const printTarget = ts.createSourceFile('', '', ts.ScriptTarget.Latest);
const printNode = (node: ts.Node) => printer.printNode(ts.EmitHint.Unspecified, node, printTarget);

const noChildTypes: ReadonlyMap<ts.Node, ts.Type> = new Map();

export const isSynthetic = (node: ts.Node) => node.pos === -1;

// A rest element `...X[]` stands for X. Any other rest element keeps its node, and the resolver reads an array it resolves to as its elements.
export function tupleElementNode(element: ts.TypeNode): ts.TypeNode {
  if (ts.isNamedTupleMember(element)) {
    return element.type;
  }
  if (ts.isRestTypeNode(element)) {
    return ts.isArrayTypeNode(element.type) ? element.type.elementType : element.type;
  }
  return element;
}

const printKey = (node: ts.TypeNode) => printNode(ts.isParenthesizedTypeNode(node) ? node.type : node);

// The printer reorders union and intersection members, so members match the types they were printed from by what they print.
function assignMembers(checker: ts.TypeChecker, enclosingDeclaration: ts.Node | undefined, members: readonly ts.TypeNode[], candidates: readonly ts.Type[], childTypes: Map<ts.Node, ts.Type>) {
  const printTable = (flags: ts.NodeBuilderFlags) => {
    const types = new Map<string, ts.Type | undefined>();
    for (const candidate of candidates) {
      const printed = checker.typeToTypeNode(candidate, enclosingDeclaration, flags);
      if (printed) {
        const key = printKey(printed);
        types.set(key, types.has(key) ? undefined : candidate);
      }
    }
    return types;
  };
  const plain = printTable(ts.NodeBuilderFlags.NoTruncation);
  let qualified: Map<string, ts.Type | undefined> | undefined;
  for (const member of members.filter(isSynthetic)) {
    const key = printKey(member);
    // TypeScript's `mapToTypeNodes` reprints union, intersection and type argument siblings whose bare names collide with `UseFullyQualifiedType`, so only such keys carry a dot.
    const type = plain.has(key) ? plain.get(key) : key.includes('.') ? (qualified ??= printTable(ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.UseFullyQualifiedType)).get(key) : undefined;
    if (type) {
      childTypes.set(member, type);
    }
  }
}

function withoutUndefined(type: ts.Type): ts.Type | undefined {
  if (!type.isUnion()) {
    return type;
  }
  const others = type.types.filter(member => !(member.flags & ts.TypeFlags.Undefined));
  return others.length === type.types.length ? type : others.length === 1 ? others[0] : undefined;
}

export function syntheticChildTypes(checker: ts.TypeChecker, parent: ts.Node, parentType: ts.Type | undefined, enclosingDeclaration: ts.Node | undefined): ReadonlyMap<ts.Node, ts.Type> {
  if (!parentType || !isSynthetic(parent)) {
    return noChildTypes;
  }
  const childTypes = new Map<ts.Node, ts.Type>();
  const assign = (child: ts.TypeNode, type: ts.Type | undefined, optional = false) => {
    // Under exactOptionalPropertyTypes the printer drops an optional member's `undefined`.
    const childType = type && optional && !ts.isUnionTypeNode(child) ? withoutUndefined(type) : type;
    if (childType && isSynthetic(child)) {
      childTypes.set(child, childType);
    }
  };

  if (ts.isArrayTypeNode(parent)) {
    if (checker.isArrayType(parentType)) {
      assign(parent.elementType, checker.getTypeArguments(parentType as ts.TypeReference)[0]);
    }
  } else if (ts.isTupleTypeNode(parent)) {
    if (checker.isTupleType(parentType)) {
      const elementTypes = checker.getTypeArguments(parentType as ts.TypeReference);
      parent.elements.forEach((element, index) => {
        if (!(ts.isNamedTupleMember(element) && element.dotDotDotToken)) {
          assign(tupleElementNode(element), elementTypes[index], ts.isNamedTupleMember(element) && !!element.questionToken);
        }
      });
    }
  } else if (ts.isTypeLiteralNode(parent)) {
    for (const member of parent.members) {
      if (ts.isIndexSignatureDeclaration(member)) {
        if (member.parameters[0].type?.kind === ts.SyntaxKind.StringKeyword) {
          assign(member.type, parentType.getStringIndexType());
        }
      } else if (ts.isPropertySignature(member) && member.type && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name))) {
        const property = parentType.getProperty(member.name.text);
        const type = property && checker.getTypeOfSymbol(property);
        assign(member.type, type, !!member.questionToken);
      }
    }
  } else if ((ts.isUnionTypeNode(parent) || ts.isIntersectionTypeNode(parent)) && parentType.isUnionOrIntersection()) {
    assignMembers(checker, enclosingDeclaration, parent.types, parentType.types, childTypes);
  }
  return childTypes;
}
