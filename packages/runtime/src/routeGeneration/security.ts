import type { Exception } from './templateHelpers';
import type { TsoaRoute } from './tsoa-route';

const missingCredentials = Symbol.for('tsoa.missingCredentials');

/**
 * Reject with this error from your authentication function to signal that the request carries no credentials
 * for the requested security scheme (as opposed to invalid credentials, which should reject with any other error).
 * It only has an effect on operations that allow anonymous access, i.e. whose security list contains an empty
 * entry (`@Security({})`): if every scheme rejected with this error, the request continues without authentication.
 * Subclasses are recognised too. An instance carries the registered symbol `Symbol.for('tsoa.missingCredentials')`,
 * so an instance from another copy of `@tsoa/runtime` in the same process is recognised as well, but an unrelated
 * error that only shares the name is not.
 */
export class MissingCredentialsError extends Error implements Exception {
  public status = 401;
  public name = 'MissingCredentialsError';
  protected [missingCredentials] = true;

  constructor(public message: string = 'No credentials provided') {
    super(message);
  }
}

function isMissingCredentials(error: unknown): boolean {
  return error instanceof Error && missingCredentials in error;
}

function ignoreMissingCredentials(error: unknown): void {
  if (!isMissingCredentials(error)) {
    throw error;
  }
}

function allowsAnonymous(security: TsoaRoute.Security[]): boolean {
  return security.some(secMethod => Object.getPrototypeOf(secMethod) === Object.prototype && Object.keys(secMethod).length === 0);
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
  // A rejection after an early answer must not surface as an unhandled rejection.
  void Promise.allSettled(attempts);
  if (!allowsAnonymous(security)) {
    return false;
  }
  return Promise.all(attempts.map(attempt => attempt.catch(ignoreMissingCredentials)))
    .then(() => true)
    .catch(() => false);
}

/** The failure to answer with: on an operation that allows anonymous access the first one that is not a missing credential, else the last. */
export function failureToReport(security: TsoaRoute.Security[], failures: unknown[]): unknown {
  const blocking = allowsAnonymous(security) ? failures.filter(failure => !isMissingCredentials(failure)) : [];
  return blocking.length ? blocking[0] : failures[failures.length - 1];
}
