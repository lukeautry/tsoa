import { expect } from 'chai';
import 'mocha';
import { App } from 'supertest/types';
import { verifyGetRequest } from '../utils';

export function registerControllerTests(app: App, basePath: string) {
  describe('Controller', () => {
    it('should normal status code', () => {
      return verifyGetRequest(
        app,
        basePath + `/Controller/normalStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should normal status code with false boolean result', () => {
      return verifyGetRequest(
        app,
        basePath + `/Controller/falseStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should normal status code with 0 result', () => {
      return verifyGetRequest(
        app,
        basePath + `/Controller/zeroStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should no content status code', () => {
      return verifyGetRequest(
        app,
        basePath + `/Controller/noContentStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });

    it('should custom status code', () => {
      return verifyGetRequest(
        app,
        basePath + `/Controller/customStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(205);
        },
        205,
      );
    });

    it('should custom header', () => {
      return verifyGetRequest(
        app,
        basePath + `/Controller/customHeader`,
        (_err, res) => {
          expect(res.status).to.equal(204);
          expect(res.header.hero).to.equal('IronMan');
          expect(res.header.name).to.equal('Tony Stark');
          expect(res.header['set-cookie']).to.eql(['token=MY_AUTH_TOKEN;', 'refreshToken=MY_REFRESH_TOKEN;']);
        },
        204,
      );
    });

    it('should unavailable for legal reasons status code', () => {
      return verifyGetRequest(
        app,
        basePath + `/Controller/unavailableForLegalReasonsStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(451);
        },
        451,
      );
    });
  });
}

export function registerNoExtendsTests(app: App, basePath: string) {
  describe('NoExtends', () => {
    it('should ignore SuccessResponse code and use default code', () => {
      return verifyGetRequest(
        app,
        basePath + `/NoExtends/customSuccessResponseCode`,
        (_err, res) => {
          expect(res.status).to.equal(202);
        },
        202,
      );
    });

    it('should ignore SuccessResponse enum code and use default code', () => {
      return verifyGetRequest(
        app,
        basePath + `/NoExtends/enumSuccessResponseCode`,
        (_err, res) => {
          expect(res.status).to.equal(202);
        },
        202,
      );
    });

    it('should ignore SuccessResponse 2XX code and use default code', () => {
      return verifyGetRequest(
        app,
        basePath + `/NoExtends/rangedSuccessResponse`,
        (_err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });
  });
}
