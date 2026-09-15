// Variant A of a merged const + type alias pair, as emitted by API client generators. The
// declarations here are verbatim copies of the ones in mergedConstModelDuplicate.ts.
export const MergedConstEnum = {
  On: 'ON',
  Off: 'OFF',
} as const;
export type MergedConstEnum = (typeof MergedConstEnum)[keyof typeof MergedConstEnum];

export interface MergedConstHolderA {
  value: MergedConstEnum;
}
