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
function ignoreMissingCredentials(error: unknown): void {
  if (!(error instanceof MissingCredentialsError || (error instanceof Error && error.name === 'MissingCredentialsError'))) {
    throw error;
  }
}

function allowsAnonymous(security: TsoaRoute.Security[]): boolean {
  return security.some(secMethod => Object.keys(secMethod).length === 0);
}

/**
 * Decides, after authentication failed, whether the request may continue anonymously: the security list must contain
 * an empty entry (`@Security({})`) and no authentication attempt may have failed with anything but a
 * {@link MissingCredentialsError}. Answers false as soon as one attempt fails otherwise, and else waits for the
 * remaining attempts, so that a slow invalid credential is not hidden by a faster missing one.
 *
 * @param security the security list of the operation
 * @param attempts every authentication promise: single schemes and the members of AND groups
 */
export async function isAnonymousFallback(security: TsoaRoute.Security[], attempts: Array<Promise<unknown>>): Promise<boolean> {
  if (!allowsAnonymous(security)) {
    return false;
  }
  return Promise.all(attempts.map(attempt => attempt.catch(ignoreMissingCredentials)))
    .then(() => true)
    .catch(() => false);
}
