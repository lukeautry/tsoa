import { expect } from 'chai';
import 'mocha';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GenerateMetadataError } from '@tsoa/cli/metadataGeneration/exceptions';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { FieldErrors, Tsoa, ValidationService } from '@tsoa/runtime';

const directory = mkdtempSync(join(tmpdir(), 'tsoa-validators-'));
const file = join(directory, 'validators.ts');
after(() => rmSync(directory, { recursive: true, force: true }));

// The line of the JSDoc annotation, which errors point at.
const annotationLine = (parameter: boolean) => (parameter ? 8 : 2);

// The validators the generator reads from an `@pattern` annotation of a property, or of a method parameter.
function readValidators(annotation: string, parameter: boolean): Tsoa.Validators | undefined {
  const decorators =
    'declare function Route(path?: string): ClassDecorator;\ndeclare function Get(): MethodDecorator;\ndeclare function Post(): MethodDecorator;\ndeclare function Query(): ParameterDecorator;\ndeclare function Body(): ParameterDecorator;\n';
  const source = parameter
    ? `${decorators}@Route('v')\nexport class ValidatorsController {\n/** @pattern value ${annotation} */\n@Get()\npublic validate(@Query() value: string): void {}\n}\n`
    : `interface Model {\n/** @pattern ${annotation} */\nvalue: string;\n}\n${decorators}@Route('v')\nexport class ValidatorsController {\n@Post()\npublic validate(@Body() body: Model): void {}\n}\n`;
  writeFileSync(file, source);
  const metadata = new MetadataGenerator(file, { experimentalDecorators: true }).Generate();
  if (parameter) {
    return metadata.controllers[0].methods[0].parameters[0].validators;
  }
  const model = metadata.referenceTypeMap['Model'];
  return model.dataType === 'refObject' ? model.properties[0].validators : undefined;
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
        { name: 'double-backtick raw source', annotation: '``foo bar`` Message', value: '``foo', errorMsg: 'bar`` Message' },
        { name: 'triple-backtick fallback', annotation: '```^a b$``` message', value: '```^a', errorMsg: 'b$``` message' },
        { name: 'unclosed wrapper', annotation: '`^a b$ message', value: '`^a', errorMsg: 'b$ message' },
        { name: 'unclosed no-space wrapper', annotation: '`^a$', value: '`^a$', errorMsg: undefined },
        { name: 'even backslashes', annotation: '`^a\\\\` message `tail`', value: '^a\\\\', errorMsg: 'message `tail`' },
        { name: 'hex backtick before an at sign', annotation: '`^a\\x60b @c$` Invalid value', value: '^a\\x60b @c$', errorMsg: 'Invalid value' },
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
          // The generator's JSON output leaves out a message the annotation has not.
          expect(readValidators(annotation, parameter)?.pattern).to.deep.equal(errorMsg === undefined ? { value } : { value, errorMsg });
        });
      }

      it('uses the existing JSDoc and parameter whitespace normalization', () => {
        expect(readValidators('  ^a$  custom message  ', parameter)?.pattern).to.deep.equal({ value: '^a$', errorMsg: ' custom message' });
      });

      for (const { annotation, source } of [
        { annotation: '[ Invalid pattern', source: '[' },
        { annotation: '`[a z` Invalid pattern', source: '[a z' },
        { annotation: '`[a z Invalid pattern', source: '`[a' },
        { annotation: '`^a\\` b$` bad value', source: '^a\\' },
        { annotation: '`^a\\\\\\` b$` message', source: '^a\\\\\\' },
      ]) {
        it(`rejects invalid source ${JSON.stringify(source)} during generation`, () => {
          expect(() => readValidators(annotation, parameter))
            .to.throw(GenerateMetadataError)
            .with.property('message')
            .that.includes(`Invalid @pattern ${JSON.stringify(source)}`)
            .and.includes('Invalid regular expression:')
            .and.includes(`At: ${file}:${annotationLine(parameter)}:${annotationLine(parameter)}.`);
        });
      }

      it('uses hex backticks in Unicode patterns and keeps the custom runtime message', () => {
        const validators = readValidators('`^a\\x60 b$`  use  `a b`', parameter);
        expect(validators?.pattern).to.deep.equal({ value: '^a\\x60 b$', errorMsg: ' use  `a b`' });
        const source = validators?.pattern?.value;
        if (typeof source !== 'string') {
          throw new Error('Expected a pattern source');
        }
        const unicodePattern = new RegExp(source, 'u');
        expect(unicodePattern.test('a` b')).to.equal(true);
        expect(unicodePattern.test('ab')).to.equal(false);

        const service = new ValidationService({}, { noImplicitAdditionalProperties: 'ignore', bodyCoercion: true });
        const errors: FieldErrors = {};
        expect(service.ValidateParam({ dataType: 'string', validators }, 'ab', 'value', errors, false)).to.equal(undefined);
        expect(errors).to.deep.equal({ value: { message: ' use  `a b`', value: 'ab' } });
      });

      for (const { annotation, accepted, rejected, message } of [
        { annotation: '`^[a-z ]+$`  only letters and `spaces`', accepted: 'a b', rejected: 'a\tb', message: ' only letters and `spaces`' },
        { annotation: '/api/.* Invalid path', accepted: '/api/path', rejected: 'api', message: 'Invalid path' },
        { annotation: '/api/v[0-9]+ Invalid path', accepted: '/api/v1', rejected: 'api', message: 'Invalid path' },
        { annotation: '`^a\\x60b @c$` Invalid value', accepted: 'a`b @c', rejected: 'ab @c', message: 'Invalid value' },
        { annotation: '``foo bar`` Message', accepted: '``foo', rejected: '`foo bar`', message: 'bar`` Message' },
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
