const knex = require('knex')
const supertest = require('supertest')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Protected Endpoints', () => {
  let db

  const { // need to add fixtures for new databases when they are created
    testUsers,
  } = helpers.makeMovingdayFixtures()

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))

  beforeEach('insert test data', () =>
    helpers.seedUsers( // change to seed all tables when they are created
      db,
      testUsers
    )
  )

  const protectedEndpoints = [
    {
      name: 'PATCH /api/users',
      path: '/api/users',
      method: supertest(app).patch
    },
    {
      name: 'GET /api/users',
      path: '/api/users',
      method: supertest(app).get
    },
  ]

  protectedEndpoints.forEach(endpoint => {
    describe(endpoint.name, () => {
      it(`responds with 401 'Missing bearer token' when no bearer token`, () => {
        return endpoint.method(endpoint.path)
          .expect(401, { error: 'Missing bearer token' })
      })

      it(`responds 401 'Unauthorized request' when invalid JWT secret`, () => {
        const validUser = testUsers[0]
        const invalidSecret = 'bad-secret'
        return endpoint.method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(validUser, invalidSecret))
          .expect(401, { error: 'Unauthorized request' })
      })

      it(`responds 401 'Unauthorized request' when invalid sub in payload`, () => {
        const invalidUser = { user_name: 'invalid_user_name', id: 1 }
        return endpoint.method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(invalidUser))
          .expect(401, { error: 'Unauthorized request' })
      })
    })
  })
})