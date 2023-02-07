import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mocha';
import { ExtendedRoutesConfig, generateRoutes } from 'tsoa';
import { DummyRouteGenerator } from '../../fixtures/templating/dummyRouteGenerator';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('RouteGenerator', () => {
  describe('.generateRoutes', () => {
    it('should instance and call a custom route generator provided as type reference', async () => {
      // Arrange
      const routesConfig: ExtendedRoutesConfig = {
        entryFile: 'index.ts',
        noImplicitAdditionalProperties: 'silently-remove-extras',
        routesDir: 'dist/routes',
        controllerPathGlobs: ['fixtures/controllers/*.ts'],
        routeGenerator: DummyRouteGenerator,
      };

      // Act
      await generateRoutes(routesConfig);

      // Assert
      expect(DummyRouteGenerator.getCallCount()).gt(0);
    });
  });
});
