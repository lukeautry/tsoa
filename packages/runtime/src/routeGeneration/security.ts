import type { Exception } from './templateHelpers';
import type { TsoaRoute } from './tsoa-route';

/**
 * Reject with this error from your authentication function to signal that the request carries no credentials
 * for the requested security scheme (as opposed to invalid credentials, which should reject with any other error).
 * It only has an effect on operations that allow anonymous access, i.e. whose security list contains an empty
 * entry (`@Security({})`): if every scheme rejected with this error, the request continues without authentication.
 */
export class MissingCredentialsError extends Error implements Exception {
  public status = 401;
  public name = 'MissingCredentialsError';

  constructor(public message: string = 'No credentials provided') {
    super(message);
  }
}

// The name match also accepts an error created by another copy of `@tsoa/runtime`.
function isMissingCredentialsError(error: unknown): boolean {
  return error instanceof MissingCredentialsError || (error as { name?: unknown } | undefined)?.name === 'MissingCredentialsError';
}

function allowsAnonymous(security: TsoaRoute.Security[]): boolean {
  return security.some(secMethod => Object.keys(secMethod).length === 0);
}

/**
 * Decides, after authentication failed, whether the request may continue anonymously: the security list must contain
 * an empty entry (`@Security({})`) and no authentication attempt may have failed with anything but a
 * {@link MissingCredentialsError}. Waits for all attempts to settle, so that a slow invalid credential is not hidden
 * by a faster missing one.
 *
 * @param security the security list of the operation
 * @param attempts every authentication promise: single schemes and the members of AND groups
 */
export async function isAnonymousFallback(security: TsoaRoute.Security[], attempts: Array<Promise<unknown>>): Promise<boolean> {
  if (!allowsAnonymous(security)) {
    return false;
  }
  const settled = await Promise.allSettled(attempts);
  return settled.every(result => result.status === 'fulfilled' || isMissingCredentialsError(result.reason));
}
