/**
 * This utils script will replace all online import split to multiple lines import like:
 * import { Get, Controller } from '@tsoa/runtime';
 *
 * into:
 * import { Controller } from '@tsoa/runtime/interfaces/controller';
 * import { Get } from '@tsoa/runtime/decorators/methods';
 *
 * Usage: ts-node import_arser.ts [file or folder name]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, lstatSync } from 'fs';
import { join } from 'path';

function parseImport(matches: string): string {
  const names = matches
    .split(/import \{ (.*?) \} from '@tsoa\/runtime';/)
    .filter((each) => each.length > 0)[0]
    .split(',')
    .map((each) => each.trim());

  const outputs: Record<string, string[]> = {
    'decorators/deprecated': [],
    'decorators/example': [],
    'decorators/parameter': [],
    'decorators/methods': [],
    'decorators/tags': [],
    'decorators/operationid': [],
    'decorators/route': [],
    'decorators/security': [],
    'decorators/extension': [],
    'decorators/middlewares': [],
    'interfaces/controller': [],
    'interfaces/response': [],
    'interfaces/iocModule': [],
    'interfaces/file': [],
    'decorators/response': [],
    'swagger/swagger': [],
    'config': [],
    'routeGeneration/additionalProps': [],
    'metadataGeneration/tsoa': [],
    'routeGeneration/templateHelpers': [],
    'routeGeneration/tsoa-route': [],
    'unknown': [],
  };

  names.forEach((name) => {
    switch (name) {
      case 'Deprecated':
      case 'Example':
      case 'Tags':
      case 'OperationId':
        outputs[`decorators/${name.toLowerCase()}`].push(name); break;
      case 'Body':
      case 'BodyProp':
      case 'Request':
      case 'Path':
      case 'Query':
      case 'Queries':
      case 'Header':
      case 'Inject':
      case 'UploadedFile':
      case 'UploadedFiles':
      case 'FormField':
      case 'Consumes':
        outputs['decorators/parameter'].push(name); break;
      case 'Options':
      case 'Get':
      case 'Post':
      case 'Patch':
      case 'Put':
      case 'Delete':
      case 'Head':
        outputs['decorators/methods'].push(name); break;
      case 'Res':
      case 'Response':
      case 'SuccessResponse':
      case 'Produces':
        outputs['decorators/response'].push(name); break;
      case 'Route':
      case 'Hidden':
        outputs['decorators/route'].push(name); break;
      case 'Security':
      case 'NoSecurity':
        outputs['decorators/security'].push(name); break;
      case 'Extension':
      case 'ExtensionType':
        outputs['decorators/extension'].push(name); break;
      case 'Middlewares as GenericMiddlewares':
        outputs['decorators/middlewares'].push(name); break;
      case 'Controller':
        outputs['interfaces/controller'].push(name); break;
      case 'TsoaResponse':
        outputs['interfaces/response'].push(name); break;
      case 'File':
        outputs['interfaces/file'].push(name); break;
      case 'IocContainerFactory':
      case 'IocContainer':
        outputs['interfaces/iocModule'].push(name); break;
      case 'Swagger':
        outputs['swagger/swagger'].push(name); break;
      case 'Tsoa':
        outputs['metadataGeneration/tsoa'].push(name); break;
      case 'TsoaRoute':
        outputs['routeGeneration/tsoa-route'].push(name); break;
      case 'FieldErrors':
      case 'ValidationService':
      case 'ValidateError':
        outputs['routeGeneration/templateHelpers'].push(name); break;
      case 'AdditionalProps':
        outputs['routeGeneration/additionalProps'].push(name); break;
      case 'Config':
        outputs['config'].push(name); break;
      default:
        outputs['unknown'].push(name); break;
    }
  });

  let output = '';
  Object.keys(outputs).forEach((outputKey) => {
    const value = outputs[outputKey];
    if (value.length > 0) {
      output += `import { ${value.join(', ')} } from '@tsoa/runtime/${outputKey}';\n`
    };
  });

  return output;
}

function replaceImport(filePath: string): void {
  const data = readFileSync(filePath, { encoding: 'utf8' });
  const matches = data
    .match(/import \{ (.*?) \} from '@tsoa\/runtime';/)
  if (matches === null) {
    return;
  }

  const matchContent = matches[0];
  const replacedImport = parseImport(matchContent);
  writeFileSync(filePath, data.replace(matchContent, replacedImport));
  console.log(`Replaced file: ${filePath}`);
}

function processFile(path: string) {
  if (!existsSync(path)) {
    console.error(`File path not exists.`)
  }

  const stat = lstatSync(path);
  if (stat.isDirectory()) {
    readdirSync(path).forEach((file) => {
      processFile(join(path, file));
    });
  } else if (stat.isFile()) {
    replaceImport(path);
  }
}

const filePath = process.argv[2];
processFile(filePath);
