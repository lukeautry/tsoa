// A generated-client style declaration of the same value set as valueSetEnum.ts, with different
// member names and order: the declared wire values are what identifies the model.
export const ValueSetEnum = {
  Beta: 'BETA',
  Alpha: 'ALPHA',
} as const;
export type ValueSetEnum = (typeof ValueSetEnum)[keyof typeof ValueSetEnum];

export interface ValueSetHolderB {
  value: ValueSetEnum;
}
