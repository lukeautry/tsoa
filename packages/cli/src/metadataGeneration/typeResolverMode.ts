import { GenerateMetadataError } from './exceptions';

/**
 * Selects how TypeScript types are turned into tsoa metadata.
 * - `legacy`: the original syntax-driven TypeResolver.
 * - `checker`: types are taken from the TypeScript checker; syntax only supplies names and annotations.
 */
export type TypeResolverMode = 'legacy' | 'checker';

const modes: readonly TypeResolverMode[] = ['legacy', 'checker'];

/**
 * An explicit option (constructor argument or tsoa config) wins, then the `TSOA_TYPE_RESOLVER`
 * environment variable, then `legacy`.
 */
export function resolveTypeResolverMode(explicit?: TypeResolverMode, env: NodeJS.ProcessEnv = process.env): TypeResolverMode {
  if (explicit) {
    if (!modes.includes(explicit)) {
      throw new GenerateMetadataError(`typeResolver must be 'legacy' or 'checker', got '${String(explicit)}'`);
    }
    return explicit;
  }
  const fromEnv = env.TSOA_TYPE_RESOLVER;
  if (fromEnv === undefined || fromEnv === '') {
    return 'legacy';
  }
  if (!modes.includes(fromEnv as TypeResolverMode)) {
    throw new GenerateMetadataError(`TSOA_TYPE_RESOLVER must be 'legacy' or 'checker', got '${fromEnv}'`);
  }
  return fromEnv as TypeResolverMode;
}
