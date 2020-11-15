const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Lists Endpoints', () => {
  let db

  const {
    testUsers,
    testLists
  } = helpers.makeMovingdayFixtures()

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))

  describe('GET /api/lists', () => {
    context('Given no lists', () => {
      beforeEach('insert users', () => helpers.seedUsers(db, testUsers))

      it('responds with 200 and an empty array', () => {
        return supertest(app)
          .get('/api/lists')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, [])
      })
    })

    context('Given there are lists in the database', () => {
      beforeEach('seed tables', () =>
        helpers.seedMovingdayTables(
          db,
          testUsers,
          [],
          testLists
        )
      )

      it('responds with 200 and lists for the logged in user', () => {
        const expectedLists = testLists.filter(list => list.user_id === testUsers[0].id)
        return supertest(app)
          .get('/api/lists')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedLists)
      })
    })

    context('Given an XSS attack list', () => {
      const testUser = testUsers[0]
      const {
        maliciousList,
        expectedList
      } = helpers.makeMaliciousList(testUser)

      beforeEach('insert malicious list', () => {
        return helpers.seedMaliciousList(
          db,
          testUser,
          maliciousList
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get('/api/lists')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body[0].list_name).to.eql(expectedList.list_name)
            expect(res.body[0].list_items).to.eql(expectedList.list_items)
          })
      })
    })
  })

  
})