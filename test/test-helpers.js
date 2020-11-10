const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

function makeUsersArray() {
  return [
    {
      id: 1,
      user_name: 'test-user-1',
      full_name: 'Test user 1',
      password: 'password',
      moving_date: '2029-02-04',
      date_created: '2029-01-22T16:28:32.615Z',
    },
    {
      id: 2,
      user_name: 'test-user-2',
      full_name: 'Test user 2',
      password: 'password',
      moving_date: '2029-02-04',
      date_created: '2029-01-22T16:28:32.615Z',
    },
    {
      id: 3,
      user_name: 'test-user-3',
      full_name: 'Test user 3',
      password: 'password',
      moving_date: '2029-02-04',
      date_created: '2029-01-22T16:28:32.615Z',
    },
    {
      id: 4,
      user_name: 'test-user-4',
      full_name: 'Test user 4',
      password: 'password',
      moving_date: '2029-02-04',
      date_created: '2029-01-22T16:28:32.615Z',
    },
  ]
}

function makeMovingdayFixtures() {
  const testUsers = makeUsersArray()
  return { testUsers }
}

function cleanTables(db) {
  return db.raw(
    `TRUNCATE
      movingday_users
      RESTART IDENTITY CASCADE`
  )
}

function seedUsers(db, users) {
  const preppedUsers = users.map(user => ({
    ...user,
    password: bcrypt.hashSync(user.password, 1)
  }))
  return db.into('movingday_users').insert(preppedUsers)
    .then(() =>
      // update the auto sequence to stay in sync
      db.raw(
        `SELECT setval('movingday_users_id_seq', ?)`,
        [users[users.length - 1].id],
      )
    )
}

function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
  const token = jwt.sign({ user_id: user.id }, secret, {
    subject: user.user_name,
    algorithm: 'HS256'
  })
  return `Bearer ${token}`
}

module.exports = {
  makeUsersArray,
  makeMovingdayFixtures,
  cleanTables,
  seedUsers,
  makeAuthHeader,
}