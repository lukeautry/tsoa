// Same type alias text as mergedConstConflict.ts, but different values in the merged const.
export const MergedConstConflictEnum = {
  Idle: 'IDLE',
  Busy: 'BUSY',
} as const;
export type MergedConstConflictEnum = (typeof MergedConstConflictEnum)[keyof typeof MergedConstConflictEnum];

export interface MergedConstConflictHolderB {
  value: MergedConstConflictEnum;
}
