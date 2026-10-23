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

export const knownDifferences: KnownDifference[] = [
  // tests/fixtures/testModel.ts, reached from most entries
  testModel('GenericModel.properties[1].type', 'legacy substitutes `T | string` with T = string textually and emits `string | string`'),
  testModel('GenericModel_string_.properties[1].type', 'legacy substitutes `T | string` with T = string textually and emits `string | string`'),
  testModel('TestSubModel2.properties', 'legacy copies inherited properties from a base that is still being built (cycle) and drops them', 1124),
  testModel('TestSubModelNamespace.TestSubModelNS.properties', 'legacy copies inherited properties from a base that is still being built (cycle) and drops them', 1124),
  testModel('NestedTypeLiteral', 'legacy registers the operand of `keyof T` (T = NestedTypeLiteral) as a model although nothing references it'),
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
  checkerFixture('parity.ts', 'error', 'legacy throws `Unknown type: TypeQuery` for `typeof value`', 737),
  checkerFixture('parity.ts', 'metadata', 'see error'),
  checkerFixture('referenceModels.ts', 'metadata.referenceTypeMap.Item.properties', 'legacy copies inherited properties from a base that is still being built (cycle) and drops them', 1124),
];
