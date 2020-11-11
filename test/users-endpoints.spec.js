const knex = require('knex')
const bcrypt = require('bcryptjs')
const xss = require('xss')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Users Endpoints', () => {
  let db

  const { testUsers } = helpers.makeMovingdayFixtures()
  const testUser = testUsers[0]

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

  describe('POST /api/users', () => {
    context('User Validation', () => {
      beforeEach('insert users', () => 
        helpers.seedUsers(
          db,
          testUsers
        )
      )

      const requiredFields = ['user_name', 'password', 'full_name']

      requiredFields.forEach(field => {
        const registerAttemptBody = {
          user_name: 'test user_name',
          password: 'test password',
          full_name: 'test full_name',
          moving_date: '2029-12-31'
        }

        it(`responds with 400 required error when '${field}' is missing`, () => {
          delete registerAttemptBody[field]

          return supertest(app)
            .post('/api/users')
            .send(registerAttemptBody)
            .expect(400, {
              error: `Missing '${field}' in request body`
            })
        })
      })

      it(`responds 400 'Password must be longer than 8 characters' when short password`, () => {
        const userShortPassword = {
          user_name: 'test user_name',
          password: '1234567',
          full_name: 'test full_name'
        }
        return supertest(app)
          .post('/api/users')
          .send(userShortPassword)
          .expect(400, { error: 'Password must be longer than 8 characters' })
      })

      it(`responds 400 'Password must be less than 72 characters' when long password`, () => {
        const userLongPassword = {
          user_name: 'test user_name',
          password: '*'.repeat(73),
          full_name: 'test full_name'
        }
        return supertest(app)
          .post('/api/users')
          .send(userLongPassword)
          .expect(400, { error: 'Password must be less than 72 characters' })
      })

      it('responds 400 error when password starts with spaces', () => {
        const userPasswordStartsSpaces = {
          user_name: 'test user_name',
          password: '  1Aa!2Bb@',
          full_name: 'test full_name'
        }
        return supertest(app)
          .post('/api/users')
          .send(userPasswordStartsSpaces)
          .expect(400, { error: 'Password must not start or end with empty space' })
      })

      it('responds 400 error when password ends with spaces', () => {
        const userPasswordEndsSpaces = {
          user_name: 'test user_name',
          password: '1Aa!2Bb@  ',
          full_name: 'test full_name'
        }
        return supertest(app)
          .post('/api/users')
          .send(userPasswordEndsSpaces)
          .expect(400, { error: 'Password must not start or end with empty space' })
      })

      it(`responds 400 error when password isn't complex enough`, () => {
        const userPasswordNotComplex = {
          user_name: 'test user_name',
          password: '11AAaabb',
          full_name: 'test full_name'
        }
        return supertest(app)
          .post('/api/users')
          .send(userPasswordNotComplex)
          .expect(400, { error: 'Password must contain at least 1 upper case letter, lower case letter, number, and special character' })
      })

      it(`responds 400 'User name already taken' when user_name isn't unique`, () => {
        const duplicateUser = {
          user_name: testUser.user_name,
          password: '11AAaa!!',
          full_name: 'test full_name'
        }
        return supertest(app)
          .post('/api/users')
          .send(duplicateUser)
          .expect(400, { error: 'Username already taken' })
      })
    })

    context('Happy path', () => {
      it('responds 201, serialized user, storing bcrypted password', () => {
        const newUser = {
          user_name: 'test user_name',
          password: '11AAaa!!',
          full_name: 'test full_name',
          moving_date: '2029-12-31'
        }
        return supertest(app)
          .post('/api/users')
          .send(newUser)
          .expect(201)
          .expect(res => {
            expect(res.body).to.have.property('id')
            expect(res.body.user_name).to.eql(xss(newUser.user_name))
            expect(res.body.full_name).to.eql(xss(newUser.full_name))
            expect(res.body).to.not.have.property('password')
            expect(res.headers.location).to.eql(`/api/users/${res.body.id}`)
            const expectedDateCreated = new Date().toLocaleString()
            const actualDateCreated = new Date(res.body.date_created).toLocaleString()
            const expectedMovingDate = new Date(newUser.moving_date).toLocaleString()
            const actualMovingDate = new Date(res.body.moving_date).toLocaleString()
            expect(actualDateCreated).to.eql(expectedDateCreated)
            expect(actualMovingDate).to.eql(expectedMovingDate)
          })
          .expect(res =>
            db
              .from('movingday_users')
              .select('*')
              .where({ id: res.body.id })
              .first()
              .then(row => {
                expect(row.user_name).to.eql(newUser.user_name)
                expect(row.full_name).to.eql(newUser.full_name)
                const expectedDBDateCreated = new Date().toLocaleString()
                const actualDBDateCreated = new Date(row.date_created).toLocaleString()
                const expectedDBMovingDate = new Date(newUser.moving_date).toLocaleString()
                const actualDBMovingDate = new Date(row.moving_date).toLocaleString()
                expect(actualDBDateCreated).to.eql(expectedDBDateCreated)
                expect(actualDBMovingDate).to.eql(expectedDBMovingDate)

                return bcrypt.compare(newUser.password, row.password)
              })
              .then(compareMatch => {
                expect(compareMatch).to.be.true
              })
          )
      })
    })
  })

  describe('PATCH /api/users', () => {
    context('Given there are users in the database', () => {
      beforeEach('insert users', () => 
        helpers.seedUsers(
          db,
          testUsers
        )
      )

      it('responds with 204 and updates user', () => {
        const updateUser = {
          moving_date: '2029-01-01'
        }
        const expectedUser = {
          ...testUser,
          ...updateUser
        }
        return supertest(app)
          .patch('/api/users')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send({
            ...updateUser,
            fieldToIgnore: 'should not be in database response'
          })
          .expect(204)
          .expect(res =>
            db
              .from('movingday_users')
              .select('*')
              .where({ id: testUser.id })
              .first()
              .then(row => {
                expect(expectedUser)
              })
          )
      })

      it('responds with 400 when moving_date not supplied', () => {
        return supertest(app)
          .patch('/api/users')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send({ full_name: 'ignoring this field', irrelevantField: 'foo' })
          .expect(400, {
            error: `Request body must contain 'moving_date'`
          })
      })
    })
  })
})