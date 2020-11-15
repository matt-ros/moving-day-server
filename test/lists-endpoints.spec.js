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

  describe('POST /api/lists', () => {
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

  describe('GET /api/lists/:id', () => {
    context('Given no lists', () => {
      beforeEach(() => helpers.seedUsers(db, testUsers))

      it('responds with 404', () => {
        const listId = 123456
        return supertest(app)
          .get(`/api/lists/${listId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `List doesn't exist` })
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

      it('responds with 200 and specified list if it belongs to logged in user', () => {
        const listId = testLists[0].id
        const expectedList = testLists[0]
        return supertest(app)
          .get(`/api/lists/${listId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedList)
      })

      it('responds with 403 Forbidden if list belongs to different user', () => {
        const listId = testLists[0].id
        const wrongUser = testUsers.find(user => user.id !== testLists[0].user_id)
        return supertest(app)
          .get(`/api/lists/${listId}`)
          .set('Authorization', helpers.makeAuthHeader(wrongUser))
          .expect(403, { error: 'List belongs to a different user' })
      })
    })

    context('Given list with XSS attack content', () => {
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
          .get(`/api/lists/${maliciousList.id}`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body.list_name).to.eql(expectedList.list_name)
            expect(res.body.list_items).to.eql(expectedList.list_items)
          })
      })
    })
  })

  describe('PATCH /api/lists/:id', () => {
    context('Given no lists', () => {
      beforeEach('insert users', () => helpers.seedUsers(db, testUsers))

      it('responds with 404', () => {
        const listId = 123456
        return supertest(app)
          .patch(`/api/lists/${listId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `List doesn't exist` })
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

      it('responds 204 and updates list if it belongs to logged in user', () => {
        const listToUpdate = testLists[0]
        const updateFields = {
          list_name: 'updated list_name',
          list_items: { 'updated list_item': false, 'another updated item': true }
        }
        const expectedList = {
          ...listToUpdate,
          ...updateFields
        }
        return supertest(app)
          .patch(`/api/lists/${listToUpdate.id}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .send(updateFields)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/lists/${listToUpdate.id}`)
              .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
              .expect(expectedList)
          )
      })

      it('responds with 403 Forbidden if list belongs to a different user', () => {
        const listId = testLists[0].id
        const wrongUser = testUsers.find(user => user.id !== testLists[0].user_id)
        return supertest(app)
          .patch(`/api/lists/${listId}`)
          .set('Authorization', helpers.makeAuthHeader(wrongUser))
          .send({ list_name: 'this request will fail' })
          .expect(403, { error: 'List belongs to a different user' })
      })

      it('responds with 400 when no required fields supplied', () => {
        const idToUpdate = testLists[0].id
        return supertest(app)
          .patch(`/api/lists/${idToUpdate}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .send({ irrelevantField: 'foo' })
          .expect(400, { error: `Request body must contain 'list_name' or 'list_items'` })
      })

      it('responds 204 when updating only a subset of fields', () => {
        const listToUpdate = testLists[0]
        const updateFields = {
          list_name: 'updated list name'
        }
        const expectedList = {
          ...listToUpdate,
          ...updateFields
        }
        return supertest(app)
          .patch(`/api/lists/${listToUpdate.id}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .send({
            ...updateFields,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/lists/${listToUpdate.id}`)
              .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
              .expect(expectedList)
          )
      })
    })
  })

  describe('DELETE /api/lists/:id', () => {
    context('Given no lists', () => {
      beforeEach('insert users', () => helpers.seedUsers(db, testUsers))

      it('responds with 404', () => {
        const listId = 123456
        return supertest(app)
          .delete(`/api/lists/${listId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `List doesn't exist` })
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

      it('responds 204 and removes the list if it belongs to logged in user', () => {
        const listToRemove = testLists[2]
        const user = testUsers.find(user => user.id === listToRemove.user_id)
        const expectedLists = testLists.filter(list => list.user_id === user.id && list.id !== listToRemove.id)
        return supertest(app)
          .delete(`/api/lists/${listToRemove.id}`)
          .set('Authorization', helpers.makeAuthHeader(user))
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/lists`)
              .set('Authorization', helpers.makeAuthHeader(user))
              .expect(expectedLists)
          )
      })

      it('responds 403 Forbidden if list belongs to different user', () => {
        const listId = testLists[0].id
        const wrongUser = testUsers.find(user => user.id !== testLists[0].user_id)
        return supertest(app)
          .delete(`/api/lists/${listId}`)
          .set('Authorization', helpers.makeAuthHeader(wrongUser))
          .expect(403, { error: 'List belongs to a different user' })
      })
    })
  })
})