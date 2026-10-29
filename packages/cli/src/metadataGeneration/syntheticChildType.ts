import * as ts from '../ts';

// Nodes printed by the checker are plain syntax: the checker cannot resolve them back to types or symbols.
// So every printed node is mapped to the type it was printed from, and its children to the types they stand for.
const printedTypes = new WeakMap<ts.Node, ts.Type | null>();
const printedEnclosingDeclarations = new WeakMap<ts.Node, ts.Node | undefined>();

export const isSynthetic = ts.isSynthetic;

/** Prints a type to a type node and remembers which type each printed node stands for. */
export function printType(checker: ts.Checker, type: ts.Type, enclosingDeclaration?: ts.Node, flags = ts.NodeBuilderFlags.NoTruncation): ts.TypeNode | undefined {
  // A printed node has no place in a source file, so it cannot scope the printer.
  if (enclosingDeclaration && isSynthetic(enclosingDeclaration)) {
    enclosingDeclaration = undefined;
  }
  const node = checker.typeToTypeNode(type, enclosingDeclaration, flags);
  if (node) {
    printedTypes.set(node, type);
    printedEnclosingDeclarations.set(node, enclosingDeclaration);
  }
  return node;
}

/** The type a printed node stands for, if it could be determined. */
export function syntheticType(checker: ts.Checker, node: ts.Node): ts.Type | undefined {
  if (!isSynthetic(node)) {
    return undefined;
  }
  if (!printedTypes.has(node)) {
    const parent = node.parent as ts.Node | undefined;
    const parentType = parent && syntheticType(checker, parent);
    if (parent && parentType) {
      assignChildTypes(checker, parent, parentType, printedEnclosingDeclarations.get(parent));
    }
    if (!printedTypes.has(node)) {
      printedTypes.set(node, null);
    }
  }
  return printedTypes.get(node) ?? undefined;
}

/** The type of a type node, whether it was written in source or printed by the checker. */
export function typeOfTypeNode(checker: ts.Checker, node: ts.TypeNode): ts.Type | undefined {
  return isSynthetic(node) ? syntheticType(checker, node) : checker.getTypeFromTypeNode(node);
}

/** The symbol an entity name in a printed type reference stands for. */
export function syntheticSymbol(checker: ts.Checker, name: ts.Node): ts.Symbol | undefined {
  // `A.B.C`: a left part names a container of the referenced symbol.
  let depth = 0;
  let child = name;
  let reference = name.parent as ts.Node | undefined;
  while (reference && ts.isQualifiedName(reference)) {
    if (reference.left === child) {
      depth++;
    }
    child = reference;
    reference = reference.parent;
  }
  if (!reference || !(ts.isTypeReferenceNode(reference) || ts.isExpressionWithTypeArguments(reference) || ts.isTypeQueryNode(reference))) {
    return undefined;
  }
  const entityName = ts.isTypeReferenceNode(reference) ? reference.typeName : ts.isTypeQueryNode(reference) ? reference.exprName : reference.expression;
  const referencedName = rightmostName(entityName);
  const type = syntheticType(checker, reference);
  // A printed name may differ from the symbol's own name, as with `import { A as B }`.
  const ownSymbols = [type?.getAliasSymbol(), type?.getSymbol()].filter((symbol): symbol is ts.Symbol => symbol !== undefined);
  let symbol =
    ownSymbols.find(own => own.name === referencedName) ??
    (referencedName !== undefined ? reachableSymbol(checker, reference, referencedName) : undefined) ??
    ownSymbols.find(own => !own.name.startsWith('__'));
  for (let i = 0; i < depth && symbol; i++) {
    symbol = symbol.getParent();
  }
  return symbol;
}

// The printer may name a type the checker no longer holds, such as `P<A | null>` for the union `P<A> | null`.
// Such a name is looked up among the symbols that the closest printed type with a known type refers to, if exactly one matches.
function reachableSymbol(checker: ts.Checker, reference: ts.Node, name: string): ts.Symbol | undefined {
  for (let node = reference.parent as ts.Node | undefined; node; node = node.parent as ts.Node | undefined) {
    const type = printedTypes.get(node);
    if (!type) {
      continue;
    }
    const matches = new Map<number, ts.Symbol>();
    const seen = new Set<number>();
    const queue: ts.Type[] = [type];
    for (let budget = 200; queue.length && budget > 0; budget--) {
      const next = queue.shift()!;
      if (seen.has(next.id)) {
        continue;
      }
      seen.add(next.id);
      for (const symbol of [next.getAliasSymbol(), next.getSymbol()]) {
        if (symbol && symbol.name === name) {
          matches.set(symbol.id, symbol);
        }
      }
      queue.push(...(next.getAliasTypeArguments() ?? []));
      if (next.isUnionType() || next.isIntersectionType()) {
        queue.push(...next.getTypes());
      } else if (next.isTypeReference()) {
        queue.push(...checker.getTypeArguments(next));
      } else if (next.getSymbol()?.name.startsWith('__')) {
        // An anonymous object type is printed with its members.
        queue.push(...next.getProperties().map(property => checker.getTypeOfSymbol(property)));
      }
    }
    return matches.size === 1 ? [...matches.values()][0] : undefined;
  }
  return undefined;
}

function rightmostName(name: ts.Node): string | undefined {
  if (ts.isIdentifier(name)) {
    return name.text;
  }
  if (ts.isQualifiedName(name)) {
    return name.right.text;
  }
  if (ts.isPropertyAccessExpression(name)) {
    return name.name.text;
  }
  return undefined;
}

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

const printNode = (node: ts.Node) => ts.getApi().printer.printNode(node);
const printKey = (node: ts.TypeNode) => printNode(ts.isParenthesizedTypeNode(node) ? node.type : node);

// The printer reorders union and intersection members, so members match the types they were printed from by what they print.
function assignMembers(
  checker: ts.Checker,
  enclosingDeclaration: ts.Node | undefined,
  members: readonly ts.TypeNode[],
  candidates: readonly ts.Type[],
  assign: (child: ts.TypeNode, type: ts.Type) => void,
) {
  // The members of a union of enum members are the members, but the printer collapses a complete enum to its name.
  const enums = new Map<ts.Symbol, ts.Type>();
  for (const candidate of candidates) {
    const parent = candidate.flags & ts.TypeFlags.EnumLiteral ? candidate.getSymbol()?.getParent() : undefined;
    if (parent && parent.flags & ts.SymbolFlags.Enum && !enums.has(parent)) {
      enums.set(parent, checker.getDeclaredTypeOfSymbol(parent));
    }
  }
  const printTable = (flags: ts.NodeBuilderFlags) => {
    const types = new Map<string, ts.Type[]>();
    for (const candidate of [...candidates, ...enums.values()]) {
      const printed = tryTypeToTypeNode(checker, candidate, enclosingDeclaration, flags);
      if (printed) {
        const key = printKey(printed);
        types.set(key, [...(types.get(key) ?? []), candidate]);
      }
    }
    return types;
  };
  const plain = printTable(ts.NodeBuilderFlags.NoTruncation);
  let qualified: Map<string, ts.Type[]> | undefined;
  const memberKeys = members.map(printKey);
  memberKeys.forEach((key, index) => {
    const sameKey = memberKeys.filter(other => other === key);
    // Members that print the same are printed in the order of the union's types.
    const types = plain.get(key) ?? (key.includes('.') ? (qualified ??= printTable(ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.UseFullyQualifiedType)).get(key) : undefined);
    if (types && types.length === sameKey.length) {
      assign(members[index], types[memberKeys.slice(0, index).filter(other => other === key).length]);
    }
  });
}

function tryTypeToTypeNode(checker: ts.Checker, type: ts.Type, enclosingDeclaration: ts.Node | undefined, flags: ts.NodeBuilderFlags): ts.TypeNode | undefined {
  try {
    return checker.typeToTypeNode(type, enclosingDeclaration, flags);
  } catch {
    // TypeScript 7.1.0-beta fails to decode some printed nodes, such as a package type printed with `UseFullyQualifiedType`.
    return undefined;
  }
}

function withoutUndefined(type: ts.Type): ts.Type | undefined {
  if (!type.isUnionType()) {
    return type;
  }
  const members = type.getTypes();
  const others = members.filter(member => !(member.flags & ts.TypeFlags.Undefined));
  return others.length === members.length ? type : others.length === 1 ? others[0] : undefined;
}

function assignChildTypes(checker: ts.Checker, parent: ts.Node, parentType: ts.Type, enclosingDeclaration: ts.Node | undefined) {
  const assign = (child: ts.Node | undefined, type: ts.Type | undefined, optional = false) => {
    if (!child || printedTypes.has(child)) {
      return;
    }
    // Under exactOptionalPropertyTypes the printer drops an optional member's `undefined`.
    const childType = type && optional && !ts.isUnionTypeNode(child) ? withoutUndefined(type) : type;
    printedTypes.set(child, childType ?? null);
    printedEnclosingDeclarations.set(child, enclosingDeclaration);
  };

  if (ts.isParenthesizedTypeNode(parent) || (ts.isTypeOperatorNode(parent) && parent.operator === ts.SyntaxKind.ReadonlyKeyword)) {
    assign(parent.type, parentType);
  } else if (ts.isArrayTypeNode(parent)) {
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
        } else if (member.parameters[0].type?.kind === ts.SyntaxKind.NumberKeyword) {
          assign(member.type, parentType.getNumberIndexType());
        }
      } else if (ts.isPropertySignatureDeclaration(member) && member.type && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name))) {
        const property = parentType.getProperty(member.name.text);
        const type = property && checker.getTypeOfSymbol(property);
        assign(member.type, type, ts.hasQuestionToken(member));
      }
    }
  } else if (ts.isTypeReferenceNode(parent) || ts.isExpressionWithTypeArguments(parent)) {
    const typeArguments = parent.typeArguments;
    if (typeArguments?.length) {
      const name = ts.isTypeReferenceNode(parent) ? parent.typeName : parent.expression;
      const aliasSymbol = parentType.getAliasSymbol();
      const argumentTypes =
        aliasSymbol && aliasSymbol.name === rightmostName(name) ? parentType.getAliasTypeArguments() : parentType.isTypeReference() ? checker.getTypeArguments(parentType) : undefined;
      // The printer leaves out trailing arguments that equal their defaults.
      typeArguments.forEach((argument, index) => assign(argument, argumentTypes?.[index]));
    }
  } else if ((ts.isUnionTypeNode(parent) || ts.isIntersectionTypeNode(parent)) && (parentType.isUnionType() || parentType.isIntersectionType())) {
    assignMembers(checker, enclosingDeclaration, parent.types, parentType.getTypes(), assign);
  }
}
