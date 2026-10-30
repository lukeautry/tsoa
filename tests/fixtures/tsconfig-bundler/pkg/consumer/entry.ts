import { resolveDefaultTemplatePath } from '@tsoa/cli/dist/routeGeneration/defaultRouteGenerator';

const templates = ['express.hbs', 'hapi.hbs', 'koa.hbs'] as const;

// This fixture mirrors a consumer application that bundles @tsoa/cli into its
// own output (esbuild rewrites __dirname to the bundle's output directory).
for (const name of templates) {
  const resolved = resolveDefaultTemplatePath(name);
  process.stdout.write(JSON.stringify({ name, resolved, exists: require('fs').existsSync(resolved) }) + '\n');
}
