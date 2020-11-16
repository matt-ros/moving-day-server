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

  describe('POST /api/boxes', () => {
    beforeEach('insert users', () => helpers.seedUsers(db, testUsers))

    context('Unhappy path', () => {
      it(`responds with 400 when 'box_name' is missing`, () => {
        const newBoxMissingName = {
          ...testBoxes[0],
          box_name: null
        }
        return supertest(app)
          .post('/api/boxes')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .send(newBoxMissingName)
          .expect(400, { error: `Missing 'box_name' in request body` })
      })
    })

    context('Happy path', () => {
      it('responds 201, serialized box', () => {
        const newBox = {
          box_name: 'test box_name',
          coming_from: 'test coming_from',
          going_to: 'test going_to',
          getting_there: 'test getting_there',
          box_notes: 'test box_notes',
          inventory: ['test item 1', 'test item 2'],
          user_id: testUsers[0].id
        }
        return supertest(app)
          .post('/api/boxes')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .send(newBox)
          .expect(201)
          .expect(res => {
            expect(res.body).to.have.property('id')
            expect(res.body.box_name).to.eql(newBox.box_name)
            expect(res.body.coming_from).to.eql(newBox.coming_from)
            expect(res.body.going_to).to.eql(newBox.going_to)
            expect(res.body.getting_there).to.eql(newBox.getting_there)
            expect(res.body.box_notes).to.eql(newBox.box_notes)
            expect(res.body.inventory).to.eql(newBox.inventory)
            expect(res.body.user_id).to.eql(newBox.user_id)
            const expectedDate = new Date().toLocaleString()
            const actualDate = new Date(res.body.date_created).toLocaleString()
            expect(actualDate).to.eql(expectedDate)
          })
          .expect(res =>
            db
              .from('movingday_boxes')
              .select('*')
              .where({ id: res.body.id })
              .first()
              .then(row => {
                expect(row.box_name).to.eql(newBox.box_name)
                expect(row.coming_from).to.eql(newBox.coming_from)
                expect(row.going_to).to.eql(newBox.going_to)
                expect(row.getting_there).to.eql(newBox.getting_there)
                expect(row.box_notes).to.eql(newBox.box_notes)
                expect(row.inventory).to.eql(newBox.inventory)
                expect(row.user_id).to.eql(newBox.user_id)
                const expectedDbDate = new Date().toLocaleString()
                const actualDbDate = new Date(row.date_created).toLocaleString()
                expect(actualDbDate).to.eql(expectedDbDate)
              })
          )
      })
    })
  })

  describe('GET /api/boxes/:id', () => {
    context('Given no boxes', () => {
      beforeEach('seed users', () => helpers.seedUsers(db, testUsers))

      it('responds with 404', () => {
        const boxId = 123456
        return supertest(app)
          .get(`/api/boxes/${boxId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Box doesn't exist` })
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

      it('responds with 200 and specified box if it belongs to logged in user', () => {
        const boxId = testBoxes[0].id
        const expectedBox = testBoxes[0]
        return supertest(app)
          .get(`/api/boxes/${boxId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedBox)
      })

      it('responds with 403 Forbidden if list belongs to a different user', () => {
        const boxId = testBoxes[0].id
        const wrongUser = testUsers.find(user => user.id !== testBoxes[0].user_id)
        return supertest(app)
          .get(`/api/boxes/${boxId}`)
          .set('Authorization', helpers.makeAuthHeader(wrongUser))
          .expect(403, { error: 'Box belongs to a different user' })
      })
    })

    context('Given box with XSS attack content', () => {
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
          .get(`/api/boxes/${maliciousBox.id}`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body.box_name).to.eql(expectedBox.box_name)
            expect(res.body.coming_from).to.eql(expectedBox.coming_from)
            expect(res.body.going_to).to.eql(expectedBox.going_to)
            expect(res.body.getting_there).to.eql(expectedBox.getting_there)
            expect(res.body.box_notes).to.eql(expectedBox.box_notes)
            expect(res.body.inventory).to.eql(expectedBox.inventory)
          })
      })
    })
  })
})