import { Config, RoutesConfig } from '../config';

export interface ValidationConfig {
  noImplicitAdditionalProperties: Exclude<Config['noImplicitAdditionalProperties'], undefined>;
  bodyCoercion: Exclude<RoutesConfig['bodyCoercion'], undefined>;
}
