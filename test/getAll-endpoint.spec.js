const knex = require('knex')
const supertest = require('supertest')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('getAll endpoint', () => {
  let db

  const {
    testUsers,
    testBoxes,
    testContacts,
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

  describe('GET /api/getAll', () => {
    context('Given no entries in the database', () => {
      beforeEach('insert users', () => helpers.seedUsers(db, testUsers))

      it('responds with 200 and an object of empty lists with user data', () => {
        const expectedObject = {
          boxes: [],
          contacts: [],
          lists: [],
          user: {
            id: testUsers[0].id,
            user_name: testUsers[0].user_name,
            full_name: testUsers[0].full_name,
            moving_date: new Date(testUsers[0].moving_date).toISOString(),
            notes: testUsers[0].notes,
            date_created: new Date(testUsers[0].date_created).toISOString()
          }
        }
        return supertest(app)
          .get('/api/getAll')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedObject)
      })
    })

    context('Given entries in the database', () => {
      beforeEach('seed tables', () =>
        helpers.seedMovingdayTables(
          db,
          testUsers,
          testContacts,
          testLists,
          testBoxes
        )
      )

      it('responds with 200 and all the entries', () => {
        const expectedResult = {
          boxes: testBoxes.filter(box => box.user_id === testUsers[0].id),
          contacts: testContacts.filter(contact => contact.user_id === testUsers[0].id),
          lists: testLists.filter(list => list.user_id === testUsers[0].id),
          user: {
            id: testUsers[0].id,
            user_name: testUsers[0].user_name,
            full_name: testUsers[0].full_name,
            moving_date: new Date(testUsers[0].moving_date).toISOString(),
            notes: testUsers[0].notes,
            date_created: new Date(testUsers[0].date_created).toISOString()
          }
        }
        return supertest(app)
          .get('/api/getAll')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedResult)
      })
    })
  })
})