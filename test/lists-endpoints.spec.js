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

  describe('POST /api/contacts', () => {
    beforeEach('insert users', () => helpers.seedUsers(db, testUsers))

    context('Unhappy path', () => {
      it(`responds with 400 when 'list_name' is missing`, () => {
        const newListMissingName = {
          ...testLists[0],
          list_name: null
        }
        return supertest(app)
          .post('/api/lists')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .send(newListMissingName)
          .expect(400, { error: `Missing 'list_name' in request body` })
      })
    })

    context('Happy path', () => {
      it('responds 201, serialized list', () => {
        const newList = {
          list_name: 'test list name',
          list_items: {'test item 1': true, 'test item 2': false},
          user_id: testUsers[0].id
        }
        return supertest(app)
          .post('/api/lists')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .send(newList)
          .expect(201)
          .expect(res => {
            expect(res.body).to.have.property('id')
            expect(res.body.list_name).to.eql(newList.list_name)
            expect(res.body.list_items).to.eql(newList.list_items)
            expect(res.body.user_id).to.eql(newList.user_id)
            const expectedDate = new Date().toLocaleString()
            const acutalDate = new Date(res.body.date_created).toLocaleString()
            expect(acutalDate).to.eql(expectedDate)
          })
          .expect(res =>
            db
              .from('movingday_lists')
              .select('*')
              .where({ id: res.body.id })
              .first()
              .then(row => {
                expect(row.list_name).to.eql(newList.list_name)
                expect(row.list_items).to.eql(newList.list_items)
                expect(row.user_id).to.eql(newList.user_id)
                const expectedDbDate = new Date().toLocaleString()
                const actualDbDate = new Date(row.date_created).toLocaleString()
                expect(actualDbDate).to.eql(expectedDbDate)
              })
          )
      })
    })
  })
})