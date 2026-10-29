import * as ts from '../ts';

// Nodes printed by the checker are plain syntax: the checker cannot resolve them back to types or symbols.
// So every printed node is mapped to the type it was printed from, and its children to the types they stand for.
const printedTypes = new WeakMap<ts.Node, ts.Type | null>();
const printedEnclosingDeclarations = new WeakMap<ts.Node, ts.Node | undefined>();
// Printed nodes whose children are being assigned types. Siblings resolve together, so each parent is worked out once.
const assigningParents = new WeakSet<ts.Node>();

export const isSynthetic = ts.isSynthetic;

/** Prints a type to a type node and remembers which type each printed node stands for. */
// Types printed without an enclosing declaration, by printer flags. The resolver prints the same types repeatedly.
const unscopedPrints = new Map<ts.NodeBuilderFlags, ts.MemoCache<ts.Type, ts.TypeNode | undefined>>();
const printedKeys: ts.MemoCache<ts.Node, string> = new WeakMap();

export function* printType(checker: ts.Checker, type: ts.Type, enclosingDeclaration?: ts.Node, flags = ts.NodeBuilderFlags.NoTruncation): ts.Op<ts.TypeNode | undefined> {
  // A printed node has no place in a source file, so it cannot scope the printer.
  if (enclosingDeclaration && isSynthetic(enclosingDeclaration)) {
    enclosingDeclaration = undefined;
  }
  let prints = unscopedPrints.get(flags);
  if (!prints) {
    prints = new WeakMap();
    unscopedPrints.set(flags, prints);
  }
  const node = enclosingDeclaration ? yield* checker.typeToTypeNode.gen(type, enclosingDeclaration, flags) : yield* ts.memo(prints, type, () => checker.typeToTypeNode.gen(type, undefined, flags));
  if (node) {
    printedTypes.set(node, type);
    printedEnclosingDeclarations.set(node, enclosingDeclaration);
  }
  return node;
}

/** The type a printed node stands for, if it could be determined. */
export function* syntheticType(checker: ts.Checker, node: ts.Node): ts.Op<ts.Type | undefined> {
  if (!isSynthetic(node)) {
    return undefined;
  }
  if (!printedTypes.has(node)) {
    const parent = node.parent as ts.Node | undefined;
    const parentType = parent && (yield* syntheticType(checker, parent));
    if (parent && parentType) {
      if (assigningParents.has(parent)) {
        while (assigningParents.has(parent)) {
          yield* ts.nextRound();
        }
      } else {
        assigningParents.add(parent);
        try {
          yield* assignChildTypes(checker, parent, parentType, printedEnclosingDeclarations.get(parent));
        } finally {
          assigningParents.delete(parent);
        }
      }
    }
    if (!printedTypes.has(node)) {
      printedTypes.set(node, null);
    }
  }
  return printedTypes.get(node) ?? undefined;
}

/** The type of a type node, whether it was written in source or printed by the checker. */
export function* typeOfTypeNode(checker: ts.Checker, node: ts.TypeNode): ts.Op<ts.Type | undefined> {
  return isSynthetic(node) ? yield* syntheticType(checker, node) : yield* checker.getTypeFromTypeNode.gen(node);
}

/** The symbol an entity name in a printed type reference stands for. */
export function* syntheticSymbol(checker: ts.Checker, name: ts.Node): ts.Op<ts.Symbol | undefined> {
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
  const type = yield* syntheticType(checker, reference);
  // A printed name may differ from the symbol's own name, as with `import { A as B }`.
  const ownSymbols = (type ? ((yield* ts.all(type.getAliasSymbol.gen(), type.getSymbol.gen())) as Array<ts.Symbol | undefined>) : []).filter((symbol): symbol is ts.Symbol => symbol !== undefined);
  let symbol =
    ownSymbols.find(own => own.name === referencedName) ??
    (referencedName !== undefined ? yield* reachableSymbol(checker, reference, referencedName) : undefined) ??
    ownSymbols.find(own => !own.name.startsWith('__'));
  for (let i = 0; i < depth && symbol; i++) {
    symbol = yield* symbol.getParent.gen();
  }
  return symbol;
}

// The printer may name a type the checker no longer holds, such as `P<A | null>` for the union `P<A> | null`.
// Such a name is looked up among the symbols that the closest printed type with a known type refers to, if exactly one matches.
function* reachableSymbol(checker: ts.Checker, reference: ts.Node, name: string): ts.Op<ts.Symbol | undefined> {
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
      const [aliasSymbol, symbol, aliasTypeArguments] = (yield* ts.all(next.getAliasSymbol.gen(), next.getSymbol.gen(), next.getAliasTypeArguments.gen())) as [
        ts.Symbol | undefined,
        ts.Symbol | undefined,
        readonly ts.Type[] | undefined,
      ];
      for (const own of [aliasSymbol, symbol]) {
        if (own && own.name === name) {
          matches.set(own.id, own);
        }
      }
      queue.push(...(aliasTypeArguments ?? []));
      if (next.isUnionType() || next.isIntersectionType()) {
        queue.push(...(yield* next.getTypes.gen()));
      } else if (next.isTypeReference()) {
        queue.push(...(yield* checker.getTypeArguments.gen(next)));
      } else if (symbol?.name.startsWith('__')) {
        // An anonymous object type is printed with its members.
        const properties = yield* next.getProperties.gen();
        queue.push(...(yield* ts.map(properties, property => checker.getTypeOfSymbol.gen(property))));
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

const printKey = (node: ts.TypeNode) => {
  const printed = ts.isParenthesizedTypeNode(node) ? node.type : node;
  return ts.memo(printedKeys, printed, () => ts.getApi().printer.printNode.gen(printed));
};

// The printer reorders union and intersection members, so members match the types they were printed from by what they print.
function* assignMembers(
  checker: ts.Checker,
  enclosingDeclaration: ts.Node | undefined,
  members: readonly ts.TypeNode[],
  candidates: readonly ts.Type[],
  assign: (child: ts.TypeNode, type: ts.Type) => void,
): ts.Op<void> {
  // The members of a union of enum members are the members, but the printer collapses a complete enum to its name.
  const enumMembers = candidates.filter(candidate => candidate.flags & ts.TypeFlags.EnumLiteral);
  const enumParents = yield* ts.map(enumMembers, function* (candidate) {
    const symbol = yield* candidate.getSymbol.gen();
    return symbol && (yield* symbol.getParent.gen());
  });
  const enums = new Map<number, ts.Symbol>();
  for (const parent of enumParents) {
    if (parent && parent.flags & ts.SymbolFlags.Enum) {
      enums.set(parent.id, parent);
    }
  }
  const enumTypes = yield* ts.map([...enums.values()], parent => checker.getDeclaredTypeOfSymbol.gen(parent));
  const printTable = function* (flags: ts.NodeBuilderFlags): ts.Op<Map<string, ts.Type[]>> {
    const printable = [...candidates, ...enumTypes];
    const keys = yield* ts.map(printable, function* (candidate) {
      const printed = enclosingDeclaration ? yield* tryTypeToTypeNode(checker, candidate, enclosingDeclaration, flags) : yield* tryPrintType(checker, candidate, flags);
      return printed && (yield* printKey(printed));
    });
    const types = new Map<string, ts.Type[]>();
    keys.forEach((key, index) => {
      if (key !== undefined) {
        types.set(key, [...(types.get(key) ?? []), printable[index]]);
      }
    });
    return types;
  };
  const [plain, memberKeys] = yield* ts.all(printTable(ts.NodeBuilderFlags.NoTruncation), ts.map(members, printKey));
  let qualified: Map<string, ts.Type[]> | undefined;
  for (const [index, key] of memberKeys.entries()) {
    const sameKey = memberKeys.filter(other => other === key);
    // Members that print the same are printed in the order of the union's types.
    const types = plain.get(key) ?? (key.includes('.') ? (qualified ??= yield* printTable(ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.UseFullyQualifiedType)).get(key) : undefined);
    if (types && types.length === sameKey.length) {
      assign(members[index], types[memberKeys.slice(0, index).filter(other => other === key).length]);
    }
  }
}

function* tryPrintType(checker: ts.Checker, type: ts.Type, flags: ts.NodeBuilderFlags): ts.Op<ts.TypeNode | undefined> {
  try {
    return yield* printType(checker, type, undefined, flags);
  } catch {
    // See tryTypeToTypeNode.
    return undefined;
  }
}

function* tryTypeToTypeNode(checker: ts.Checker, type: ts.Type, enclosingDeclaration: ts.Node | undefined, flags: ts.NodeBuilderFlags): ts.Op<ts.TypeNode | undefined> {
  try {
    return yield* checker.typeToTypeNode.gen(type, enclosingDeclaration, flags);
  } catch {
    // TypeScript 7.1.0-beta fails to decode some printed nodes, such as a package type printed with `UseFullyQualifiedType`.
    return undefined;
  }
}

function* withoutUndefined(type: ts.Type): ts.Op<ts.Type | undefined> {
  if (!type.isUnionType()) {
    return type;
  }
  const members = yield* type.getTypes.gen();
  const others = members.filter(member => !(member.flags & ts.TypeFlags.Undefined));
  return others.length === members.length ? type : others.length === 1 ? others[0] : undefined;
}

function* assignChildTypes(checker: ts.Checker, parent: ts.Node, parentType: ts.Type, enclosingDeclaration: ts.Node | undefined): ts.Op<void> {
  const assignType = (child: ts.Node | undefined, type: ts.Type | undefined) => {
    if (child && !printedTypes.has(child)) {
      printedTypes.set(child, type ?? null);
      printedEnclosingDeclarations.set(child, enclosingDeclaration);
    }
  };
  // Under exactOptionalPropertyTypes the printer drops an optional member's `undefined`.
  const assign = function* (child: ts.Node | undefined, type: ts.Type | undefined, optional = false): ts.Op<void> {
    assignType(child, child && type && optional && !ts.isUnionTypeNode(child) ? yield* withoutUndefined(type) : type);
  };

  if (ts.isParenthesizedTypeNode(parent) || (ts.isTypeOperatorNode(parent) && parent.operator === ts.SyntaxKind.ReadonlyKeyword)) {
    assignType(parent.type, parentType);
  } else if (ts.isArrayTypeNode(parent)) {
    if (yield* checker.isArrayType.gen(parentType)) {
      assignType(parent.elementType, (yield* checker.getTypeArguments.gen(parentType as ts.TypeReference))[0]);
    }
  } else if (ts.isTupleTypeNode(parent)) {
    if (yield* checker.isTupleType.gen(parentType)) {
      const elementTypes = yield* checker.getTypeArguments.gen(parentType as ts.TypeReference);
      yield* ts.map(parent.elements, (element, index) =>
        ts.isNamedTupleMember(element) && element.dotDotDotToken ? ts.nextRound() : assign(tupleElementNode(element), elementTypes[index], ts.isNamedTupleMember(element) && !!element.questionToken),
      );
    }
  } else if (ts.isTypeLiteralNode(parent)) {
    yield* ts.map(parent.members, function* (member) {
      if (ts.isIndexSignatureDeclaration(member)) {
        if (member.parameters[0].type?.kind === ts.SyntaxKind.StringKeyword) {
          assignType(member.type, yield* parentType.getStringIndexType.gen());
        } else if (member.parameters[0].type?.kind === ts.SyntaxKind.NumberKeyword) {
          assignType(member.type, yield* parentType.getNumberIndexType.gen());
        }
      } else if (ts.isPropertySignatureDeclaration(member) && member.type && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name))) {
        const property = yield* parentType.getProperty.gen(member.name.text);
        const type = property && (yield* checker.getTypeOfSymbol.gen(property));
        yield* assign(member.type, type, ts.hasQuestionToken(member));
      }
    });
  } else if (ts.isTypeReferenceNode(parent) || ts.isExpressionWithTypeArguments(parent)) {
    const typeArguments = parent.typeArguments;
    if (typeArguments?.length) {
      const name = ts.isTypeReferenceNode(parent) ? parent.typeName : parent.expression;
      const aliasSymbol = yield* parentType.getAliasSymbol.gen();
      const argumentTypes =
        aliasSymbol && aliasSymbol.name === rightmostName(name)
          ? yield* parentType.getAliasTypeArguments.gen()
          : parentType.isTypeReference()
            ? yield* checker.getTypeArguments.gen(parentType)
            : undefined;
      // The printer leaves out trailing arguments that equal their defaults.
      typeArguments.forEach((argument, index) => assignType(argument, argumentTypes?.[index]));
    }
  } else if ((ts.isUnionTypeNode(parent) || ts.isIntersectionTypeNode(parent)) && (parentType.isUnionType() || parentType.isIntersectionType())) {
    yield* assignMembers(checker, enclosingDeclaration, parent.types, yield* parentType.getTypes.gen(), assignType);
  }
}
