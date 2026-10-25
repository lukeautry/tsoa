import { rejects } from 'assert';
import express from 'express';
import 'mocha';
import { verifyGetRequest } from './utils';

describe('HTTP request verification', () => {
  it('rejects when a response assertion throws', async () => {
    const app = express();
    app.get('/', (_req, res) => {
      res.send('ok');
    });
    const failure = new Error('Response assertion failed');

    await rejects(
      verifyGetRequest(app, '/', () => {
        throw failure;
      }),
      error => error === failure,
    );
  });

  it('rejects when a failed-status assertion throws', async () => {
    const app = express();
    app.get('/', (_req, res) => {
      res.sendStatus(500);
    });
    const failure = new Error('Error response assertion failed');

    await rejects(
      verifyGetRequest(app, '/', () => {
        throw failure;
      }),
      error => error === failure,
    );
  });
});
