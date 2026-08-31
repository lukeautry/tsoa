// The type alias below has the same text as the one in mergedConstConflictDuplicate.ts, but the
// merged const it reads its values from differs, so the two models genuinely conflict.
export const MergedConstConflictEnum = {
  On: 'ON',
  Off: 'OFF',
} as const;
export type MergedConstConflictEnum = (typeof MergedConstConflictEnum)[keyof typeof MergedConstConflictEnum];

export interface MergedConstConflictHolderA {
  value: MergedConstConflictEnum;
}
