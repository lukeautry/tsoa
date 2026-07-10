import { expect } from 'chai';
import 'mocha';
import * as ts from 'typescript';
import { getParameterValidators, getPropertyValidators } from '@tsoa/cli/utils/validatorUtils';

describe('Validator JSDoc utilities', () => {
  const sourceFile = ts.createSourceFile(
    'validators.ts',
    `
      interface Model {
        /** @pattern /^[a-zA-Z0-9 ]*$/ */
        value: string;
      }
      /** @pattern value /^[a-zA-Z0-9 ]*$/ only letters, numbers, and spaces */
      function validate(value: string) {}
    `,
    ts.ScriptTarget.Latest,
    true,
  );
  const model = sourceFile.statements[0] as ts.InterfaceDeclaration;
  const validate = sourceFile.statements[1] as ts.FunctionDeclaration;

  it('preserves spaces in property regex literals', () => {
    expect(getPropertyValidators(model.members[0]).pattern).to.deep.equal({
      errorMsg: undefined,
      value: '^[a-zA-Z0-9 ]*$',
    });
  });

  it('preserves spaces in parameter regex literals', () => {
    expect(getParameterValidators(validate.parameters[0], 'value').pattern).to.deep.equal({
      errorMsg: 'only letters, numbers, and spaces',
      value: '^[a-zA-Z0-9 ]*$',
    });
  });
});
