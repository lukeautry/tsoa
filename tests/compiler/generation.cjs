// Run after yarn build. Each controller is isolated so known limits cannot hide
// successful generation or differences in other controllers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const { withCompiler } = require('../../packages/cli/dist/compiler');
const { MetadataGenerator } = require('../../packages/cli/dist/metadataGeneration/metadataGenerator');
const { generateSpec, generateRoutes } = require('../../packages/cli/dist');
const unorderedArrays = new Set(['enum', 'required', 'anyOf', 'oneOf', 'allOf']);

function normalizeSwagger(value, keys = []) {
  if (Array.isArray(value)) {
    const items = value.map(item => normalizeSwagger(item, [...keys, '[]']));
    return unorderedArrays.has(keys.at(-1)) ? items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : items;
  }
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, normalizeSwagger(value[key], [...keys, key])]),
    );
  // Accept only the known native JSDoc rendering difference, not arbitrary text changes.
  if (keys.join('.') === 'components.schemas.DanglingContext_number_.description' && typeof value === 'string') return value.replace('{@link TSameNameDifferentValue}', 'TSameNameDifferentValue');
  return value;
}

async function main() {
  const root = path.resolve(__dirname, '..');
  process.chdir(root);
  const output = path.resolve(process.argv[2]);
  const baseline = process.argv[3] && path.resolve(process.argv[3]);
  fs.mkdirSync(output, { recursive: true });
  const results = {};
  for (const file of [
    ...fs
      .readdirSync('fixtures/controllers')
      .filter(file => file.endsWith('Controller.ts'))
      .map(file => path.join('fixtures/controllers', file)),
    'fixtures/compiler/backendController.ts',
  ].sort()) {
    const name = path.basename(file, '.ts');
    const directory = path.join(output, name);
    const config = {
      entryFile: path.resolve(file),
      noImplicitAdditionalProperties: 'silently-remove-extras',
      bodyCoercion: true,
      outputDirectory: directory,
      routesDir: directory,
      middleware: 'express',
      specVersion: 3.1,
      name: 'Compiler parity',
      version: '1.0.0',
    };
    try {
      const metadata = await withCompiler(() => new MetadataGenerator(config.entryFile, { experimentalDecorators: true, strictNullChecks: true, skipLibCheck: true }).Generate());
      await generateSpec(config, undefined, undefined, metadata);
      await generateRoutes(config, undefined, undefined, metadata);
      results[name] = { status: 'passed' };
    } catch (error) {
      results[name] = { status: 'failed', error: error.message.split('\n')[0] };
    }
  }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  if (baseline) {
    const reference = JSON.parse(fs.readFileSync(path.join(baseline, 'results.json')));
    const differences = [];
    const semanticDifferences = [];
    const limits = [];
    let compared = 0;
    for (const [name, result] of Object.entries(results)) {
      if (reference[name].status !== 'passed') continue;
      if (result.status !== 'passed') {
        limits.push({ name, error: result.error });
        continue;
      }
      compared++;
      for (const file of ['swagger.json', 'routes.ts']) {
        const actual = fs.readFileSync(path.join(output, name, file), 'utf8');
        const expected = fs.readFileSync(path.join(baseline, name, file), 'utf8');
        if (actual !== expected) differences.push(`${name}/${file}`);
        // Routes also embed object literals and ordered validation subSchemas;
        // report their bytes, but gate only on the Swagger comparison.
        if (file === 'swagger.json' && !isDeepStrictEqual(normalizeSwagger(JSON.parse(actual)), normalizeSwagger(JSON.parse(expected)))) semanticDifferences.push(`${name}/${file}`);
      }
    }
    const report = { compared, differences, semanticDifferences, semanticFiles: ['swagger.json'], limits };
    fs.writeFileSync(path.join(output, 'comparison.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    assert.equal(semanticDifferences.length, 0, 'Generated Swagger must match the classic compiler by meaning');
    assert.ok(compared >= 23, 'Keep representative generation coverage');
    for (const limit of limits) {
      assert.equal(limit.name, 'getController', 'Unexpected native exclusion');
      assert.match(limit.error, /Synthetic type reference lookup is not supported with the (typescript|tsrs) compiler backend/, `${limit.name}: unexpected native failure`);
    }
  }
  console.log(`${Object.values(results).filter(r => r.status === 'passed').length} passed, ${Object.values(results).filter(r => r.status === 'failed').length} failed`);
}

module.exports = { normalizeSwagger };
if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
