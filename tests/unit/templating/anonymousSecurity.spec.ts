import { expect } from 'chai';
import 'mocha';
import { MissingCredentialsError, failureToReport, isAnonymousFallback } from '@tsoa/runtime';
import type { TsoaRoute } from '@tsoa/runtime';
import { MissingCredentialsError as MissingCredentialsErrorCopy } from '@tsoa/runtime/routeGeneration/security';

describe('anonymous security helpers', () => {
  describe('MissingCredentialsError', () => {
    it('is a 401 error named MissingCredentialsError', () => {
      const error = new MissingCredentialsError();

      expect(error).to.be.instanceOf(MissingCredentialsError);
      expect(error).to.be.instanceOf(Error);
      expect(error.status).to.equal(401);
      expect(error.name).to.equal('MissingCredentialsError');
      expect(error.message).to.equal('No credentials provided');
    });

    it('keeps a custom message', () => {
      expect(new MissingCredentialsError('no token').message).to.equal('no token');
    });
  });

  describe('isAnonymousFallback', () => {
    const failed = (reason: unknown) => {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the cases reject with non-Error values on purpose
      const attempt = Promise.reject(reason);
      attempt.catch(() => undefined);
      return attempt;
    };

    it('is true when anonymous access is allowed and every failure is a missing credential', async () => {
      expect(await isAnonymousFallback([{ api_key: [] }, {}], [failed(new MissingCredentialsError())])).to.be.true;
    });

    it('is true for an empty-entry-only security list without attempts', async () => {
      expect(await isAnonymousFallback([{}], [])).to.be.true;
    });

    it('is true when the other members of an AND group succeeded', async () => {
      expect(await isAnonymousFallback([{ api_key: [], tsoa_auth: [] }, {}], [Promise.resolve({ id: 1 }), failed(new MissingCredentialsError())])).to.be.true;
    });

    it('is true when the empty entry is listed first', async () => {
      expect(await isAnonymousFallback([{}, { api_key: [] }], [failed(new MissingCredentialsError())])).to.be.true;
    });

    it('recognizes a subclass of MissingCredentialsError', async () => {
      class ExpiredSessionError extends MissingCredentialsError {}

      expect(await isAnonymousFallback([{ api_key: [] }, {}], [failed(new ExpiredSessionError())])).to.be.true;
    });

    it('recognizes an error from another copy of the module', async () => {
      const copy = new MissingCredentialsErrorCopy('no token');

      expect(copy).to.not.be.instanceOf(MissingCredentialsError);
      expect(await isAnonymousFallback([{ api_key: [] }, {}], [failed(copy)])).to.be.true;
    });

    it('is false for an unrelated error that only shares the name', async () => {
      const unrelated = Object.assign(new Error('no token'), { name: 'MissingCredentialsError' });

      expect(await isAnonymousFallback([{ api_key: [] }, {}], [failed(unrelated)])).to.be.false;
    });

    it('is false when anonymous access is not allowed', async () => {
      expect(await isAnonymousFallback([{ api_key: [] }], [failed(new MissingCredentialsError())])).to.be.false;
    });

    it('is false when any failure is not a missing credential', async () => {
      expect(await isAnonymousFallback([{ api_key: [] }, {}], [failed(new MissingCredentialsError()), failed(new Error('invalid token'))])).to.be.false;
    });

    for (const [description, reason] of [
      ['an object with a status', { status: 401 }],
      ['an object that only carries the error name', { name: 'MissingCredentialsError', message: 'no token' }],
      ['the error name as a string', 'MissingCredentialsError'],
      ['undefined', undefined],
      ['null', null],
    ] as const) {
      it(`is false when a failure is ${description}`, async () => {
        expect(await isAnonymousFallback([{ api_key: [] }, {}], [failed(reason)])).to.be.false;
      });
    }

    it('waits for pending attempts so a slow invalid credential is not hidden', async () => {
      const slowInvalid = new Promise((_resolve, reject) => setTimeout(() => reject(new Error('invalid token')), 10));

      expect(await isAnonymousFallback([{ api_key: [], tsoa_auth: [] }, {}], [failed(new MissingCredentialsError()), slowInvalid])).to.be.false;
    });

    it('answers false without waiting for a pending attempt once another attempt failed with an invalid credential', async () => {
      const neverSettles = new Promise(() => undefined);
      const timeout = new Promise(resolve => setTimeout(() => resolve('still waiting'), 100));
      const answer = isAnonymousFallback([{ api_key: [], tsoa_auth: [] }, {}], [failed(new Error('invalid token')), neverSettles]);

      expect(await Promise.race([answer, timeout])).to.be.false;
    });

    it('is false for an entry that a security name set as its prototype', async () => {
      // the generated route for @Security('__proto__') contains the literal {"__proto__":[]}
      const entry = { __proto__: [] };
      expect(Object.keys(entry)).to.be.empty;

      expect(await isAnonymousFallback([entry], [])).to.be.false;
      expect(await isAnonymousFallback([{ api_key: [] }, entry], [failed(new MissingCredentialsError())])).to.be.false;
    });

    it('does not wait for pending attempts when anonymous access is not allowed', async () => {
      const neverSettles = new Promise(() => undefined);

      expect(await isAnonymousFallback([{ api_key: [] }], [neverSettles])).to.be.false;
    });

    it('observes the attempts when anonymous access is not allowed, so a later rejection is not unhandled', async () => {
      const rejections: unknown[] = [];
      const record = (reason: unknown) => rejections.push(reason);
      process.on('unhandledRejection', record);

      try {
        const slowInvalid = new Promise((_resolve, reject) => setTimeout(() => reject(new Error('invalid token')), 10));

        expect(await isAnonymousFallback([{ api_key: [] }], [slowInvalid])).to.be.false;
        await new Promise(resolve => setTimeout(resolve, 30));

        expect(rejections).to.deep.equal([]);
      } finally {
        process.off('unhandledRejection', record);
      }
    });
  });

  describe('failureToReport', () => {
    const optional: TsoaRoute.Security[] = [{ api_key: [] }, { tsoa_auth: [] }, {}];
    const required: TsoaRoute.Security[] = [{ api_key: [] }, { tsoa_auth: [] }];
    const missing = new MissingCredentialsError('no token');
    const invalid = new Error('invalid token');
    const expired = new Error('expired token');

    it('reports the invalid credential when a scheme without credentials failed after it', () => {
      expect(failureToReport(optional, [invalid, missing])).to.equal(invalid);
    });

    it('skips a scheme without credentials that failed first', () => {
      expect(failureToReport(optional, [missing, invalid])).to.equal(invalid);
    });

    it('reports the first of several invalid credentials', () => {
      expect(failureToReport(optional, [invalid, expired])).to.equal(invalid);
    });

    it('reports an invalid credential that is a falsy rejection', () => {
      expect(failureToReport(optional, [null, missing])).to.equal(null);
    });

    it('reports the last failure when every failure is a missing credential', () => {
      const other = new MissingCredentialsError('other');

      expect(failureToReport(optional, [missing, other])).to.equal(other);
    });

    it('reports the last failure when anonymous access is not allowed', () => {
      expect(failureToReport(required, [invalid, missing])).to.equal(missing);
      expect(failureToReport(required, [invalid, expired])).to.equal(expired);
    });
  });
});
