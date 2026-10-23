import * as ts from 'typescript';
import { ProjectionStep } from './compilerQueries';
import { OwnedCompiler } from './ownedCompiler';
import { TypePresentation } from './typePresentation';

export type Meaning = { kind: 'bound' } | { kind: 'exact'; type: ts.Type };
export type Context = ReadonlyMap<ts.Symbol, { occurrence: Occurrence; name: string }>;
export type ComputedOrigin = { kind: 'value'; node: ts.EntityName; steps: readonly ProjectionStep[] } | { kind: 'projection'; owner: Occurrence; steps: readonly ProjectionStep[] };
export type SourceRecipe = { kind: 'source'; compiler: OwnedCompiler; node: ts.TypeNode; context: Context; meaning: Meaning };
export type Occurrence =
  | SourceRecipe
  | { kind: 'computed'; compiler: OwnedCompiler; presentation: TypePresentation; context: Context; origin?: ComputedOrigin }
  | {
      kind: 'heritage';
      compiler: OwnedCompiler;
      node: ts.TypeNode;
      context: Context;
      meaning: Meaning;
      baseNode: ts.ExpressionWithTypeArguments;
      owner: Meaning;
      excluded: ReadonlySet<string>;
    };
