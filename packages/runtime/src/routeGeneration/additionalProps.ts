import { Config } from '../config';

export interface AdditionalProps {
  noImplicitAdditionalProperties: Exclude<Config['noImplicitAdditionalProperties'], undefined>;
}
