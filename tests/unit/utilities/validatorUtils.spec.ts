import { expect } from 'chai';
import 'mocha';
import * as ts from 'typescript';
import { GenerateMetadataError } from '@tsoa/cli/metadataGeneration/exceptions';
import { getParameterValidators, getPropertyValidators } from '@tsoa/cli/utils/validatorUtils';
import { FieldErrors, ValidationService } from '@tsoa/runtime';

function readValidators(annotation: string, parameter: boolean) {
  const sourceFile = ts.createSourceFile(
    'validators.ts',
    parameter ? `/** @pattern value ${annotation} */\nfunction validate(value: string) {}` : `interface Model {\n/** @pattern ${annotation} */\nvalue: string;\n}`,
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = sourceFile.statements[0];
  if (declaration && ts.isInterfaceDeclaration(declaration)) {
    return getPropertyValidators(declaration.members[0]);
  }
  if (declaration && ts.isFunctionDeclaration(declaration)) {
    return getParameterValidators(declaration.parameters[0], 'value');
  }
  throw new Error('Expected a model or function declaration');
}

describe('Validator JSDoc utilities', () => {
  for (const parameter of [false, true]) {
    describe(parameter ? 'parameter patterns' : 'property patterns', () => {
      for (const { name, annotation, value, errorMsg } of [
        { name: 'bare source', annotation: '^[a-z]+$', value: '^[a-z]+$', errorMsg: undefined },
        { name: 'bare slash source', annotation: '/api/.* Invalid path', value: '/api/.*', errorMsg: 'Invalid path' },
        { name: 'bare slash path', annotation: '/api/v[0-9]+ Invalid path', value: '/api/v[0-9]+', errorMsg: 'Invalid path' },
        { name: 'slashes without flags', annotation: '/abc/', value: '/abc/', errorMsg: undefined },
        { name: 'trailing letters as source', annotation: '/abc/i', value: '/abc/i', errorMsg: undefined },
        { name: 'no-space wrapper', annotation: '`^a+$`  custom message', value: '^a+$', errorMsg: ' custom message' },
        { name: 'quoted spaces', annotation: '`^[a-z ]+$`', value: '^[a-z ]+$', errorMsg: undefined },
        { name: 'quoted slash and spaces', annotation: '`^[a-z/ ]+$` bad value', value: '^[a-z/ ]+$', errorMsg: 'bad value' },
        { name: 'message spaces and backticks', annotation: '`^a b$`  use  `a b`', value: '^a b$', errorMsg: ' use  `a b`' },
        { name: 'bare message spaces and backticks', annotation: '^a$  use  `a`', value: '^a$', errorMsg: ' use  `a`' },
        { name: 'empty source', annotation: '``', value: '', errorMsg: undefined },
        { name: 'empty source with message', annotation: '`` message', value: '', errorMsg: 'message' },
        { name: 'lone backtick', annotation: '`', value: '`', errorMsg: undefined },
        { name: 'double backticks', annotation: '``^a$`` message', value: '`^a$`', errorMsg: 'message' },
        { name: 'triple backticks', annotation: '```^a$``` message', value: '``^a$``', errorMsg: 'message' },
        { name: 'double-backtick fallback', annotation: '``^a b$`` message', value: '``^a', errorMsg: 'b$`` message' },
        { name: 'triple-backtick fallback', annotation: '```^a b$``` message', value: '```^a', errorMsg: 'b$``` message' },
        { name: 'unclosed wrapper', annotation: '`^a b$ message', value: '`^a', errorMsg: 'b$ message' },
        { name: 'unclosed no-space wrapper', annotation: '`^a$', value: '`^a$', errorMsg: undefined },
        { name: 'escaped delimiter', annotation: '`^a\\` b$` bad value', value: '^a\\` b$', errorMsg: 'bad value' },
        { name: 'even backslashes', annotation: '`^a\\\\` message `tail`', value: '^a\\\\', errorMsg: 'message `tail`' },
        { name: 'odd backslashes', annotation: '`^a\\\\\\` b$` message', value: '^a\\\\\\` b$', errorMsg: 'message' },
        { name: 'backtick within source', annotation: '`^a`b c$` message', value: '^a`b c$', errorMsg: 'message' },
        { name: 'bare literal tab', annotation: '^[a-z\t]+$', value: '^[a-z\t]+$', errorMsg: undefined },
        { name: 'quoted literal tab', annotation: '`^[a-z\t]+$` message', value: '^[a-z\t]+$', errorMsg: 'message' },
        { name: 'tab is not a separator', annotation: '`^a$`\tmessage', value: '`^a$`\tmessage', errorMsg: undefined },
        { name: 'LF stops the quoted scan', annotation: '`a\n b c` message', value: '`a\nb', errorMsg: 'c` message' },
        { name: 'CR stops the quoted scan', annotation: '`a\r b c` message', value: '`a\rb', errorMsg: 'c` message' },
        { name: 'CRLF stops the quoted scan', annotation: '`a\r\n b c` message', value: '`a\r\nb', errorMsg: 'c` message' },
        { name: 'backslash before LF', annotation: '`a\\\n b c` message', value: '`a\\\nb', errorMsg: 'c` message' },
        { name: 'backslash before CRLF', annotation: '`a\\\r\n b c` message', value: '`a\\\r\nb', errorMsg: 'c` message' },
      ]) {
        it(`preserves ${name}`, () => {
          expect(readValidators(annotation, parameter)?.pattern).to.deep.equal({ value, errorMsg });
        });
      }

      it('uses the existing JSDoc and parameter whitespace normalization', () => {
        expect(readValidators('  ^a$  custom message  ', parameter)?.pattern).to.deep.equal({ value: '^a$', errorMsg: ' custom message' });
      });

      for (const { annotation, source } of [
        { annotation: '[ Invalid pattern', source: '[' },
        { annotation: '`[a z` Invalid pattern', source: '[a z' },
        { annotation: '`[a z Invalid pattern', source: '`[a' },
      ]) {
        it(`rejects invalid source ${JSON.stringify(source)} during generation`, () => {
          expect(() => readValidators(annotation, parameter))
            .to.throw(GenerateMetadataError)
            .with.property('message')
            .that.includes(source)
            .and.includes('At: validators.ts:');
        });
      }

      for (const { annotation, accepted, rejected, message } of [
        { annotation: '`^[a-z ]+$`  only letters and `spaces`', accepted: 'a b', rejected: 'a\tb', message: ' only letters and `spaces`' },
        { annotation: '/api/.* Invalid path', accepted: '/api/path', rejected: 'api', message: 'Invalid path' },
        { annotation: '/api/v[0-9]+ Invalid path', accepted: '/api/v1', rejected: 'api', message: 'Invalid path' },
        { annotation: '`^a\\` b$` bad value', accepted: 'a` b', rejected: 'ab', message: 'bad value' },
        { annotation: '`^a\\\\` bad value', accepted: 'a\\', rejected: 'a`', message: 'bad value' },
        { annotation: '^[a-z\t]+$ Only letters and tabs', accepted: 'a\tb', rejected: 'a b', message: 'Only letters and tabs' },
      ]) {
        it(`uses ${JSON.stringify(annotation)} in runtime validation`, () => {
          const validators = readValidators(annotation, parameter);
          const service = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true });
          const errors: FieldErrors = {};
          expect(service.ValidateParam({ dataType: 'string', validators }, accepted, 'value', errors, false)).to.equal(accepted);
          expect(errors).to.deep.equal({});
          expect(service.ValidateParam({ dataType: 'string', validators }, rejected, 'value', errors, false)).to.equal(undefined);
          expect(errors).to.deep.equal({ value: { message, value: rejected } });
        });
      }
    });
  }

  it('rejects a property pattern without a source', () => {
    expect(() => readValidators('', false)).to.throw(GenerateMetadataError, 'pattern parameter use string.');
  });
});
