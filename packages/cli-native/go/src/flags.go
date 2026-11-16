package main

import (
	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
)

// Flag tables map tsgo's single-bit enum members to TypeScript 6's member names. Node maps the names back to
// TS 6 numbers, so a Go member with no TS 6 counterpart has no entry (see NOTES.md).

type flagName struct {
	bit  uint64
	name string
}

func flagNames(flags uint64, table []flagName) []string {
	names := []string{}
	for _, f := range table {
		if flags&f.bit != 0 {
			names = append(names, f.name)
		}
	}
	return names
}

var typeFlagNames = []flagName{
	{uint64(checker.TypeFlagsAny), "Any"},
	{uint64(checker.TypeFlagsUnknown), "Unknown"},
	{uint64(checker.TypeFlagsUndefined), "Undefined"},
	{uint64(checker.TypeFlagsNull), "Null"},
	{uint64(checker.TypeFlagsVoid), "Void"},
	{uint64(checker.TypeFlagsString), "String"},
	{uint64(checker.TypeFlagsNumber), "Number"},
	{uint64(checker.TypeFlagsBigInt), "BigInt"},
	{uint64(checker.TypeFlagsBoolean), "Boolean"},
	{uint64(checker.TypeFlagsESSymbol), "ESSymbol"},
	{uint64(checker.TypeFlagsStringLiteral), "StringLiteral"},
	{uint64(checker.TypeFlagsNumberLiteral), "NumberLiteral"},
	{uint64(checker.TypeFlagsBigIntLiteral), "BigIntLiteral"},
	{uint64(checker.TypeFlagsBooleanLiteral), "BooleanLiteral"},
	{uint64(checker.TypeFlagsUniqueESSymbol), "UniqueESSymbol"},
	{uint64(checker.TypeFlagsEnumLiteral), "EnumLiteral"},
	{uint64(checker.TypeFlagsEnum), "Enum"},
	{uint64(checker.TypeFlagsNonPrimitive), "NonPrimitive"},
	{uint64(checker.TypeFlagsNever), "Never"},
	{uint64(checker.TypeFlagsTypeParameter), "TypeParameter"},
	{uint64(checker.TypeFlagsObject), "Object"},
	{uint64(checker.TypeFlagsIndex), "Index"},
	{uint64(checker.TypeFlagsTemplateLiteral), "TemplateLiteral"},
	{uint64(checker.TypeFlagsStringMapping), "StringMapping"},
	{uint64(checker.TypeFlagsSubstitution), "Substitution"},
	{uint64(checker.TypeFlagsIndexedAccess), "IndexedAccess"},
	{uint64(checker.TypeFlagsConditional), "Conditional"},
	{uint64(checker.TypeFlagsUnion), "Union"},
	{uint64(checker.TypeFlagsIntersection), "Intersection"},
}

// Bits 0-20 mean the same on every type that carries object flags.
var commonObjectFlagNames = []flagName{
	{uint64(checker.ObjectFlagsClass), "Class"},
	{uint64(checker.ObjectFlagsInterface), "Interface"},
	{uint64(checker.ObjectFlagsReference), "Reference"},
	{uint64(checker.ObjectFlagsTuple), "Tuple"},
	{uint64(checker.ObjectFlagsAnonymous), "Anonymous"},
	{uint64(checker.ObjectFlagsMapped), "Mapped"},
	{uint64(checker.ObjectFlagsInstantiated), "Instantiated"},
	{uint64(checker.ObjectFlagsObjectLiteral), "ObjectLiteral"},
	{uint64(checker.ObjectFlagsEvolvingArray), "EvolvingArray"},
	{uint64(checker.ObjectFlagsObjectLiteralPatternWithComputedProperties), "ObjectLiteralPatternWithComputedProperties"},
	{uint64(checker.ObjectFlagsReverseMapped), "ReverseMapped"},
	{uint64(checker.ObjectFlagsJsxAttributes), "JsxAttributes"},
	{uint64(checker.ObjectFlagsJSLiteral), "JSLiteral"},
	{uint64(checker.ObjectFlagsFreshLiteral), "FreshLiteral"},
	{uint64(checker.ObjectFlagsArrayLiteral), "ArrayLiteral"},
	{uint64(checker.ObjectFlagsPrimitiveUnion), "PrimitiveUnion"},
	{uint64(checker.ObjectFlagsContainsWideningType), "ContainsWideningType"},
	{uint64(checker.ObjectFlagsContainsObjectOrArrayLiteral), "ContainsObjectOrArrayLiteral"},
	{uint64(checker.ObjectFlagsNonInferrableType), "NonInferrableType"},
	{uint64(checker.ObjectFlagsCouldContainTypeVariablesComputed), "CouldContainTypeVariablesComputed"},
	{uint64(checker.ObjectFlagsCouldContainTypeVariables), "CouldContainTypeVariables"},
}

// Bits from 22 up are reused per type kind, as in TS 6; these are the object-type meanings.
var objectOnlyFlagNames = []flagName{
	{uint64(checker.ObjectFlagsContainsSpread), "ContainsSpread"},
	{uint64(checker.ObjectFlagsObjectRestType), "ObjectRestType"},
	{uint64(checker.ObjectFlagsInstantiationExpressionType), "InstantiationExpressionType"},
	{uint64(checker.ObjectFlagsSingleSignatureType), "SingleSignatureType"},
	{uint64(checker.ObjectFlagsIsClassInstanceClone), "IsClassInstanceClone"},
	{uint64(checker.ObjectFlagsIdenticalBaseTypeCalculated), "IdenticalBaseTypeCalculated"},
	{uint64(checker.ObjectFlagsIdenticalBaseTypeExists), "IdenticalBaseTypeExists"},
}

// objectFlagNames reads object flags only off object types. Union and intersection types also carry object flags in
// TS 6, but tsoa never reads them there (protocol revision 8).
func objectFlagNames(t *checker.Type) []string {
	if t.Flags()&checker.TypeFlagsObject == 0 {
		return []string{}
	}
	flags := uint64(t.ObjectFlags())
	return append(flagNames(flags, commonObjectFlagNames), flagNames(flags, objectOnlyFlagNames)...)
}

var elementFlagNames = []flagName{
	{uint64(checker.ElementFlagsRequired), "Required"},
	{uint64(checker.ElementFlagsOptional), "Optional"},
	{uint64(checker.ElementFlagsRest), "Rest"},
	{uint64(checker.ElementFlagsVariadic), "Variadic"},
}

var symbolFlagNames = []flagName{
	{uint64(ast.SymbolFlagsFunctionScopedVariable), "FunctionScopedVariable"},
	{uint64(ast.SymbolFlagsBlockScopedVariable), "BlockScopedVariable"},
	{uint64(ast.SymbolFlagsProperty), "Property"},
	{uint64(ast.SymbolFlagsEnumMember), "EnumMember"},
	{uint64(ast.SymbolFlagsFunction), "Function"},
	{uint64(ast.SymbolFlagsClass), "Class"},
	{uint64(ast.SymbolFlagsInterface), "Interface"},
	{uint64(ast.SymbolFlagsConstEnum), "ConstEnum"},
	{uint64(ast.SymbolFlagsRegularEnum), "RegularEnum"},
	{uint64(ast.SymbolFlagsValueModule), "ValueModule"},
	{uint64(ast.SymbolFlagsNamespaceModule), "NamespaceModule"},
	{uint64(ast.SymbolFlagsTypeLiteral), "TypeLiteral"},
	{uint64(ast.SymbolFlagsObjectLiteral), "ObjectLiteral"},
	{uint64(ast.SymbolFlagsMethod), "Method"},
	{uint64(ast.SymbolFlagsConstructor), "Constructor"},
	{uint64(ast.SymbolFlagsGetAccessor), "GetAccessor"},
	{uint64(ast.SymbolFlagsSetAccessor), "SetAccessor"},
	{uint64(ast.SymbolFlagsSignature), "Signature"},
	{uint64(ast.SymbolFlagsTypeParameter), "TypeParameter"},
	{uint64(ast.SymbolFlagsTypeAlias), "TypeAlias"},
	{uint64(ast.SymbolFlagsExportValue), "ExportValue"},
	{uint64(ast.SymbolFlagsAlias), "Alias"},
	{uint64(ast.SymbolFlagsPrototype), "Prototype"},
	{uint64(ast.SymbolFlagsExportStar), "ExportStar"},
	{uint64(ast.SymbolFlagsOptional), "Optional"},
	{uint64(ast.SymbolFlagsTransient), "Transient"},
	{uint64(ast.SymbolFlagsAssignment), "Assignment"},
	{uint64(ast.SymbolFlagsModuleExports), "ModuleExports"},
}
