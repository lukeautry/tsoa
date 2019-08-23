import { RoutesConfigRelatedToSwagger } from '..';
import { SwaggerConfigRelatedToRoutes } from '../routeGeneration/routeGenerator';

export const validateMutualConfigs = (routesConfig: RoutesConfigRelatedToSwagger, swaggerConfig: SwaggerConfigRelatedToRoutes): void => {
  const validateControllerPathGlobs = (test: string[]): void => {
    if (!Array.isArray(test)) {
      throw new Error(`controllerPathGlobs must be an array`);
    }
    if (!test.length) {
      throw new Error(`controllerPathGlobs must include at least one glob string`);
    }
    test.forEach(item => {
      if (typeof item !== 'string' || item === '') {
        throw new Error(`Found a value (${item}) that is not a valid glob for controllerPathGlobs`);
      }
    });
  };

  const haveSameValues = (array1: string[], array2: string[]): boolean => {
    return array1.every(item => array2.includes(item));
  };

  if (routesConfig.controllerPathGlobs) {
    validateControllerPathGlobs(routesConfig.controllerPathGlobs);
  }
  if (swaggerConfig.controllerPathGlobs) {
    validateControllerPathGlobs(swaggerConfig.controllerPathGlobs);
  }
  if (swaggerConfig.controllerPathGlobs && routesConfig.controllerPathGlobs) {
    if (!haveSameValues(swaggerConfig.controllerPathGlobs, routesConfig.controllerPathGlobs)) {
      throw new Error(`You do not have to pass controllerPathGlobs for both SwaggerConfig and RoutesConfig; ` + `but if you do, then they must have the same values. Current they differ.`);
    }
  }
};
