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

export interface FalsyExampleModel {
  skip: SkipNumber;
  flag: Flag;
  note: Note;
  level: Level;
}

@Route('FalsyExample')
export class FalsyExampleController {
  @Get()
  public async get(): Promise<FalsyExampleModel> {
    return { skip: 0, flag: false, note: '', level: Level.Low };
  }
}
