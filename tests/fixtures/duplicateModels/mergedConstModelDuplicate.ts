// Variant B of a merged const + type alias pair, holding verbatim copies of the declarations in
// mergedConstModel.ts.
export const MergedConstEnum = {
  On: 'ON',
  Off: 'OFF',
} as const;
export type MergedConstEnum = (typeof MergedConstEnum)[keyof typeof MergedConstEnum];

export interface MergedConstHolderB {
  value: MergedConstEnum;
}
