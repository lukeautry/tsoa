/**
 * Differences between the legacy and checker type resolvers that are intended:
 * cases where legacy is wrong (or throws) and the checker resolver is right.
 * `entry` is the fixture path relative to `tests/` (or '*' for every entry); `path` is a
 * JSON path prefix into the normalized outcome (`metadata.…` or `error`).
 */
export interface KnownDifference {
  entry: string;
  path: string;
  reason: string;
  issue?: number;
}

const testModel = (path: string, reason: string, issue?: number): KnownDifference => ({ entry: '*', path: `metadata.referenceTypeMap.${path}`, reason, issue });
const checkerFixture = (fixture: string, path: string, reason: string, issue?: number): KnownDifference => ({ entry: `fixtures/checker/${fixture}`, path, reason, issue });
const syntheticFixture = (fixture: string, path: string, reason: string): KnownDifference => ({ entry: `fixtures/controllers/syntheticChildren/${fixture}`, path, reason });

export const knownDifferences: KnownDifference[] = [
  // tests/fixtures/testModel.ts, reached from most entries
  testModel('GenericModel.properties[1].type', 'legacy substitutes `T | string` with T = string textually and emits `string | string`'),
  testModel('GenericModel_string_.properties[1].type', 'legacy substitutes `T | string` with T = string textually and emits `string | string`'),
  testModel('TestSubModel2.properties', 'legacy copies inherited properties from a base that is still being built (cycle) and drops them', 1124),
  testModel('TestSubModelNamespace.TestSubModelNS.properties', 'legacy copies inherited properties from a base that is still being built (cycle) and drops them', 1124),
  testModel('NestedTypeLiteral', 'legacy registers the operand of `keyof T` (T = NestedTypeLiteral) as a model although nothing references it'),
  testModel('Record_id.string_.type.properties', 'strict mode: legacy emits {} for Record with literal keys'),
  testModel('Record_id._myProp1-string__.type.properties', 'strict mode: legacy emits {} for Record with literal keys'),
  testModel(
    'Pick_Partial__a-string--b-string__.Exclude_keyofPartial__a-string--b-string__.a__.type.properties',
    'strict mode: legacy emits {} for Omit of a Partial (keyof Partial<X> includes undefined there)',
  ),
  testModel('Record_string.any_.type.additionalProperties', 'legacy drops the index signature of `Record<string, any>` when it reaches it through a defaulted type parameter'),
  {
    entry: 'fixtures/controllers/unsupportedIndexedTypeController.ts',
    path: 'error',
    reason: 'legacy cannot resolve an indexed access into an imported value type; checker resolves ForeignIndexedValue',
  },
  { entry: 'fixtures/controllers/unsupportedIndexedTypeController.ts', path: 'metadata', reason: 'see error' },
  // tests/fixtures/checker: regression fixtures for legacy failures
  checkerFixture('members.ts', 'metadata.referenceTypeMap.Partial_User_', 'legacy resolves Partial<T> inside a generic alias against the unbound T and emits {}', 1764),
  checkerFixture('members.ts', 'metadata.referenceTypeMap.Required_Pick_User.id__', 'legacy resolves Required<Pick<T, K>> inside a generic alias against the unbound T and emits {}', 1764),
  checkerFixture('members.ts', 'metadata.referenceTypeMap.Pick_Account.Exclude_keyofAccount.id__', 'legacy types constructor parameter properties as any through Pick'),
  checkerFixture('members.ts', 'metadata.referenceTypeMap.Pick_WithUuid.Exclude_keyofWithUuid.label__.type.properties[0].type', 'legacy drops the UUID alias (and its @pattern) through Omit', 1543),
  checkerFixture('members.ts', 'metadata.referenceTypeMap.UUID', 'legacy drops the UUID alias (and its @pattern) through Omit', 1543),
  checkerFixture('parityTypeof.ts', 'error', 'legacy throws `Unknown type: TypeQuery` for `typeof value`', 737),
  checkerFixture('parityTypeof.ts', 'metadata', 'see error'),
  checkerFixture('regressions.ts', 'error', 'legacy rejects typeof, enum-member indexed access, Uppercase, template literals, Exclude, keyof typeof, z.infer'),
  checkerFixture('regressions.ts', 'metadata', 'see error'),
  checkerFixture('review.ts', 'metadata.controllers[0].methods[6].type', 'legacy reads `[...Pair, Order]` as `[Order, ...Pair]`'),
  checkerFixture('review.ts', 'metadata.controllers[0].methods[6].responses[0].schema', 'legacy reads `[...Pair, Order]` as `[Order, ...Pair]`'),
  checkerFixture('review.ts', 'metadata.referenceTypeMap.Pair', 'legacy registers the spread tuple alias as the rest type'),
  checkerFixture('review.ts', 'metadata.referenceTypeMap.Patch_User_.type.properties', 'legacy resolves a generic mapped alias against the unbound T and emits {}', 1764),
  checkerFixture('referenceModels.ts', 'metadata.referenceTypeMap.Item.properties', 'legacy copies inherited properties from a base that is still being built (cycle) and drops them', 1124),
  // tests/fixtures/controllers/syntheticChildren (checked by tests/unit/swagger/syntheticChildren.spec.ts)
  syntheticFixture(
    'ownArraysController.ts',
    'metadata.referenceTypeMap.ReadonlyArray_Leaf_',
    'legacy names a renamed import by its declared name inside a mapped type; checker keeps the written FrozenChain_Leaf_',
  ),
  syntheticFixture(
    'exactNullAliasLitFirstController.ts',
    'metadata.referenceTypeMap',
    'legacy emits {} for P<Leaf | null> when the optional member comes first, and names it P_Leaf_ when null is erased',
  ),
  syntheticFixture('exactNullAliasDirectFirstController.ts', 'metadata.referenceTypeMap', 'legacy names P<Leaf | null> P_Leaf_ when null is erased and lists null first'),
  syntheticFixture('sharedPrintController.ts', 'metadata.referenceTypeMap', 'legacy emits {} for union members that print the same name; checker resolves them'),
];
