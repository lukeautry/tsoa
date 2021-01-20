import { expect } from 'chai';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { spy } from 'sinon';

describe('Overlapping routes', () => {
  it('should reject methods with same routes', () => {
    expect(() => {
      new MetadataGenerator('./fixtures/controllers/duplicateMethodsController.ts').Generate();
    }).to.throw(`Duplicate method signature @get(GetTest/Complex) found in controllers: DuplicateMethodsTestController#getModel, DuplicateMethodsTestController#duplicateGetModel\n`);
  });

  it('should warn about duplicate path parameters', () => {
    const consoleWarn = spy(console, 'warn');

    new MetadataGenerator('./fixtures/controllers/duplicatePathParamController.ts').Generate();

    console.log(consoleWarn.getCalls().map(c => JSON.stringify(c.args)));

    expect(consoleWarn.calledWith('[Method headPathParamTest route: Head/{id}] may never be invoked, because its route is partially collides with [Method headPathParamTest2 route: Head/{id}/{id2}]'))
      .to.be.true;

    expect(
      consoleWarn.calledWith(
        'Duplicate path parameter definition signature found in controller DuplicatePathParamTestController at [method GET getPathParamTest, getPathParamTest2], [method POST postPathParamTest, postPathParamTest2, postPathParamTest3], [method DELETE deletePathParamTest, deletePathParamTest3]\n',
      ),
    ).to.be.true;

    consoleWarn.restore();
  });
});
