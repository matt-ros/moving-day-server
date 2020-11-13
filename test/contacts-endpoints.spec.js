const knex = require('knex')
const supertest = require('supertest')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Contacts Endpoints', () => {
  let db

  const {
    testUsers,
    testContacts
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

  describe('GET /api/contacts', () => {
    context('Given no contacts', () => {
      beforeEach('insert users', () => helpers.seedUsers(db, testUsers))
      
      it('responds with 200 and an empty list', () => {
        return supertest(app)
          .get('/api/contacts')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, [])
      })
    })

    context('Given there are contacts in the database', () => {
      beforeEach('seed tables', () =>
        helpers.seedMovingdayTables(
          db,
          testUsers,
          testContacts,
        )
      )

      it('responds with 200 and contacts for the logged in user', () => {
        const expectedContacts = testContacts.filter(contact => contact.user_id === testUsers[0].id)
        return supertest(app)
          .get('/api/contacts')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedContacts)
      })
    })

    context('Given a contact with XSS content', () => {
      const testUser = testUsers[0]
      const {
        maliciousContact,
        expectedContact,
      } = helpers.makeMaliciousContact(testUser)

      beforeEach('insert malicious contact', () => {
        return helpers.seedMaliciousContact(
          db,
          testUser,
          maliciousContact,
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get('/api/contacts')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body[0].contact_name).to.eql(expectedContact.contact_name)
            expect(res.body[0].contact_phone).to.eql(expectedContact.contact_phone)
            expect(res.body[0].contact_email).to.eql(expectedContact.contact_email)
            expect(res.body[0].contact_notes).to.eql(expectedContact.contact_notes)
          })
      })
    })
  })

  describe('POST /api/contacts', () => {
    beforeEach('insert users', () => helpers.seedUsers(db, testUsers))

    context('Unhappy path', () => {
      it(`responds with 400 when 'contact_name' is missing`, () => {
        const newContactMissingName = {
          ...testContacts[0],
          contact_name: null
        }
        return supertest(app)
          .post('/api/contacts')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .send(newContactMissingName)
          .expect(400, { error: `Missing 'contact_name' in request body` })
      })
    })

    context('Happy path', () => {
      it('responds 201, serialized contact', () => {
        const newContact = {
          contact_name: 'test contact name',
          contact_phone: '567-890-1234',
          contact_email: 'test@testemail.com',
          contact_notes: 'here are some test notes',
          user_id: testUsers[0].id
        }
        return supertest(app)
          .post('/api/contacts')
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .send(newContact)
          .expect(201)
          .expect(res => {
            expect(res.body).to.have.property('id')
            expect(res.body.contact_name).to.eql(newContact.contact_name)
            expect(res.body.contact_phone).to.eql(newContact.contact_phone)
            expect(res.body.contact_email).to.eql(newContact.contact_email)
            expect(res.body.contact_notes).to.eql(newContact.contact_notes)
            expect(res.body.user_id).to.eql(newContact.user_id)
            const expectedDateCreated = new Date().toLocaleString()
            const actualDateCreated =  new Date(res.body.date_created).toLocaleString()
            expect(actualDateCreated).to.eql(expectedDateCreated)
          })
          .expect(res =>
            db
              .from('movingday_contacts')
              .select('*')
              .where({ id: res.body.id })
              .first()
              .then(row => {
                expect(row.contact_name).to.eql(newContact.contact_name)
                expect(row.contact_phone).to.eql(newContact.contact_phone)
                expect(row.contact_email).to.eql(newContact.contact_email)
                expect(row.contact_notes).to.eql(newContact.contact_notes)
                expect(row.user_id).to.eql(newContact.user_id)
                const expectedDbDateCreated = new Date().toLocaleString()
                const actualDbDateCreated = new Date(row.date_created).toLocaleString()
                expect(actualDbDateCreated).to.eql(expectedDbDateCreated)
              })
          )
      })
    })
  })

  describe.only('GET /api/contacts/:id', () => {
    context('Given no contacts', () => {
      beforeEach(() => helpers.seedUsers(db, testUsers))

      it('responds with 404', () => {
        const contactId = 123456
        return supertest(app)
          .get(`/api/contacts/${contactId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(404, { error: `Contact doesn't exist` })
      })
    })

    context('Given there are contacts in the database', () => {
      beforeEach('seed tables', () => 
        helpers.seedMovingdayTables(
          db,
          testUsers,
          testContacts,
        )
      )

      it('responds with 200 and specified contact if it belongs to logged in user', () => {
        const contactId = 1
        const expectedContact = testContacts[contactId - 1]
        return supertest(app)
          .get(`/api/contacts/${contactId}`)
          .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
          .expect(200, expectedContact)
      })

      it('responds with 403 Forbidden if contact belongs to different user', () => {
        const contactId = testContacts[0].id
        const wrongUser = testUsers.find(user => user.id !== testContacts[0].user_id)
        return supertest(app)
          .get(`/api/contacts/${contactId}`)
          .set('Authorization', helpers.makeAuthHeader(wrongUser))
          .expect(403, { error: 'Contact belongs to a different user' })
      })
    })

    context('Given contact with XSS attack content', () => {
      const testUser = testUsers[0]
      const {
        maliciousContact,
        expectedContact,
      } = helpers.makeMaliciousContact(testUser)

      beforeEach('insert malicious contact', () => {
        return helpers.seedMaliciousContact(
          db,
          testUser,
          maliciousContact,
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/contacts/${maliciousContact.id}`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body.contact_name).to.eql(expectedContact.contact_name)
            expect(res.body.contact_phone).to.eql(expectedContact.contact_phone)
            expect(res.body.contact_email).to.eql(expectedContact.contact_email)
            expect(res.body.contact_notes).to.eql(expectedContact.contact_notes)
          })
      })
    })
  })
})