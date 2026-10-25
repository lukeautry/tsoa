import { Get, Route } from '@tsoa/runtime';

/**
 * @isInt
 * @example 0
 */
export type SkipNumber = number;

/**
 * @example false
 */
export type Flag = boolean;

/**
 * @example ""
 */
export type Note = string;

/**
 * @example 0
 */
export enum Level {
  Low = 0,
  High = 1,
}

/**
 * @example null
 */
export type NullNote = string | null;

/**
 * @deprecated
 */
export type OldFlag = boolean;

/**
 * @example 0
 */
export interface MergedCount {
  first: number;
}

/**
 * @example 5
 */
export interface MergedCount {
  second: number;
}

export interface FalsyExampleModel {
  skip: SkipNumber;
  flag: Flag;
  note: Note;
  level: Level;
  nullNote: NullNote;
  oldFlag: OldFlag;
  merged: MergedCount;
}

@Route('FalsyExample')
export class FalsyExampleController {
  @Get()
  public async get(): Promise<FalsyExampleModel> {
    return { skip: 0, flag: false, note: '', level: Level.Low, nullNote: null, oldFlag: false, merged: { first: 0, second: 0 } };
  }
}
