const app = require('../src/app');

describe('App', () => {
  it('GET /api/hello responds with 200 containing JSON object { ok: true }', () => {
    return supertest(app)
      .get('/api/hello')
      .expect(200, { ok: true })
  });
});