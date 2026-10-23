import { expect } from 'chai';
import 'mocha';
import { MissingCredentialsError, allowsAnonymous, isAnonymousFallback, isMissingCredentialsError } from '@tsoa/runtime';

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

  describe('isMissingCredentialsError', () => {
    it('detects instances', () => {
      expect(isMissingCredentialsError(new MissingCredentialsError())).to.be.true;
    });

    it('detects errors by name, e.g. from another copy of @tsoa/runtime', () => {
      const foreign = Object.assign(new Error('no token'), { name: 'MissingCredentialsError' });

      expect(isMissingCredentialsError(foreign)).to.be.true;
    });

    it('rejects other values', () => {
      expect(isMissingCredentialsError(new Error('invalid token'))).to.be.false;
      expect(isMissingCredentialsError({ status: 401 })).to.be.false;
      expect(isMissingCredentialsError('MissingCredentialsError')).to.be.false;
      expect(isMissingCredentialsError(undefined)).to.be.false;
      expect(isMissingCredentialsError(null)).to.be.false;
    });
  });

  describe('allowsAnonymous', () => {
    it('is true when the security list contains an empty entry', () => {
      expect(allowsAnonymous([{ api_key: [] }, {}])).to.be.true;
      expect(allowsAnonymous([{}])).to.be.true;
    });

    it('is false otherwise', () => {
      expect(allowsAnonymous([])).to.be.false;
      expect(allowsAnonymous([{ api_key: [] }, { api_key: [], tsoa_auth: ['read'] }])).to.be.false;
    });
  });

  describe('isAnonymousFallback', () => {
    it('is true when anonymous access is allowed and every failure is a missing credential', async () => {
      expect(await isAnonymousFallback([{ api_key: [] }, {}], [], [new MissingCredentialsError()])).to.be.true;
    });

    it('is true for an empty-entry-only security list without failures', async () => {
      expect(await isAnonymousFallback([{}], [], [])).to.be.true;
    });

    it('is false when anonymous access is not allowed', async () => {
      expect(await isAnonymousFallback([{ api_key: [] }], [], [new MissingCredentialsError()])).to.be.false;
    });

    it('is false when any failure is not a missing credential', async () => {
      expect(await isAnonymousFallback([{ api_key: [] }, {}], [], [new MissingCredentialsError(), new Error('invalid token')])).to.be.false;
    });

    it('waits for pending attempts so a slow invalid credential is not hidden', async () => {
      const failures: unknown[] = [new MissingCredentialsError()];
      const slowInvalid = new Promise((_resolve, reject) => setTimeout(() => reject(new Error('invalid token')), 10)).catch((error: unknown) => {
        failures.push(error);
        throw error;
      });

      expect(await isAnonymousFallback([{ api_key: [], tsoa_auth: [] }, {}], [slowInvalid], failures)).to.be.false;
      expect(failures).to.have.length(2);
    });

    it('does not wait for pending attempts when anonymous access is not allowed', async () => {
      const neverSettles = new Promise(() => undefined);

      expect(await isAnonymousFallback([{ api_key: [] }], [neverSettles], [])).to.be.false;
    });
  });
});
