import { existsSync } from 'fs';
import { resolveDefaultTemplatePath } from '@tsoa/cli/dist/routeGeneration/defaultRouteGenerator';

const templates = ['express.hbs', 'hapi.hbs', 'koa.hbs'] as const;

// This fixture mirrors a consumer application that bundles @tsoa/cli into its
// own output (esbuild rewrites __dirname to the bundle's output directory).
// The deep import is resolved at runtime from the built package, but it is not
// part of this tsconfig's program, so the symbol is typed as `any`. Cast it to
// the expected signature instead of relying on inference.
const resolveTemplate = resolveDefaultTemplatePath as (name: string) => string;

for (const name of templates) {
  const resolved = resolveTemplate(name);
  process.stdout.write(JSON.stringify({ name, resolved, exists: existsSync(resolved) }) + '\n');
}
