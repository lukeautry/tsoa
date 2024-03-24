import { Config, RoutesConfig } from '../config';

export interface AdditionalProps {
  noImplicitAdditionalProperties: Exclude<Config['noImplicitAdditionalProperties'], undefined>;
  bodyCoercion: Exclude<RoutesConfig['bodyCoercion'], undefined>;
}
