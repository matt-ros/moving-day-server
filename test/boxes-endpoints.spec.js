const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Boxes Endpoints', () => {
  let db

  const {
    testUsers,
    testBoxes
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

  describe('GET /api/boxes', () => {
    context('Given no boxes', () => {
      beforeEach('insert users', () => helpers.seedUsers(db, testUsers))

      it('responds with 200 and an empty array', () => {
        return supertest(app)
          .get('/api/boxes')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, [])
      })
    })

    context('Given there are boxes in the database', () => {
      beforeEach('seed tables', () =>
        helpers.seedMovingdayTables(
          db,
          testUsers,
          [],
          [],
          testBoxes
        )
      )

      it('responds with 200 and boxes for the logged in user', () => {
        const expectedBoxes = testBoxes.filter(box => box.user_id === testUsers[0].id)
        return supertest(app)
          .get('/api/boxes')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedBoxes)
      })
    })

    context('Given an XSS attack box', () => {
      const testUser = testUsers[0]
      const {
        maliciousBox,
        expectedBox
      } = helpers.makeMaliciousBox(testUser)

      beforeEach('insert malicious box', () => {
        return helpers.seedMaliciousBox(
          db,
          testUser,
          maliciousBox
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get('/api/boxes')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body[0].box_name).to.eql(expectedBox.box_name)
            expect(res.body[0].coming_from).to.eql(expectedBox.coming_from)
            expect(res.body[0].going_to).to.eql(expectedBox.going_to)
            expect(res.body[0].getting_there).to.eql(expectedBox.getting_there)
            expect(res.body[0].box_notes).to.eql(expectedBox.box_notes)
            expect(res.body[0].inventory).to.eql(expectedBox.inventory)
          })
      })
    })
  })
})