import { knownLimit } from '../../../utils/knownLimit';
import { withCompiler } from '@tsoa/cli/compiler';
import { expect } from 'chai';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { spy } from 'sinon';

describe('Overlapping routes', () => {
  // COMPILERS.md limit: inferred import return types.
  it('should reject methods with same routes', () =>
    knownLimit(
      ['typescript@7.0.2', 'typescript@7.1.0-beta', 'tsrs@0.20.0-ts7.1.0-beta'],
      /but got 'Unknown type: LastTypeNode\\nAt: /,
    )(() => {
      return withCompiler(() => {
        expect(() => {
          new MetadataGenerator('./fixtures/controllers/duplicateMethodsController.ts').Generate();
        }).to.throw(`Duplicate method signature @get(GetTest/Complex) found in controllers: DuplicateMethodsTestController#getModel, DuplicateMethodsTestController#duplicateGetModel\n`);
      });
    }));

  it('should warn about duplicate path parameters', () => {
    return withCompiler(() => {
      const consoleWarn = spy(console, 'warn');

      new MetadataGenerator('./fixtures/controllers/duplicatePathParamController.ts').Generate();

      expect(
        consoleWarn.calledWith(
          'Duplicate path parameter definition signature found in controller DuplicatePathParamTestController [ method GET getPathParamTest2 route: {identifier} ] collides with [ method GET getPathParamTest route: {id} ]\n',
        ),
      ).to.be.true;

      expect(
        consoleWarn.calledWith(
          'Duplicate path parameter definition signature found in controller DuplicatePathParamTestController [ method POST postPathParamTest2 route: {identifier} ] collides with [ method POST postPathParamTest route: {id} ]\n',
        ),
      ).to.be.true;

      expect(
        consoleWarn.calledWith(
          'Duplicate path parameter definition signature found in controller DuplicatePathParamTestController [ method POST postPathParamTest3 route: :anotherIdentifier ] collides with [ method POST postPathParamTest route: {id} ], [ method POST postPathParamTest2 route: {identifier} ]\n',
        ),
      ).to.be.true;

      expect(
        consoleWarn.calledWith(
          'Overlapping path parameter definition signature found in controller DuplicatePathParamTestController [ method POST postPathParamTest4 route: {identifier}-{identifier2} ] collides with [ method POST postPathParamTest route: {id} ], [ method POST postPathParamTest2 route: {identifier} ], [ method POST postPathParamTest3 route: :anotherIdentifier ]\n',
        ),
      ).to.be.true;

      expect(
        consoleWarn.calledWith(
          'Duplicate path parameter definition signature found in controller DuplicatePathParamTestController [ method DELETE deletePathParamTest3 route: Delete/:identifier ] collides with [ method DELETE deletePathParamTest route: Delete/{id} ]\n',
        ),
      ).to.be.true;

      expect(consoleWarn.callCount).to.be.eq(6);

      consoleWarn.restore();
    });
  });
});
