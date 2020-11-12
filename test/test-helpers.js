const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

function makeUsersArray() {
  return [
    {
      id: 1,
      user_name: 'test-user-1',
      full_name: 'Test user 1',
      password: 'password',
      notes: 'these are some test notes',
      moving_date: '2029-02-04',
      date_created: '2029-01-22T16:28:32.615Z',
    },
    {
      id: 2,
      user_name: 'test-user-2',
      full_name: 'Test user 2',
      password: 'password',
      notes: 'these are some test notes',
      moving_date: '2029-02-04',
      date_created: '2029-01-22T16:28:32.615Z',
    },
    {
      id: 3,
      user_name: 'test-user-3',
      full_name: 'Test user 3',
      password: 'password',
      notes: 'these are some test notes',
      moving_date: '2029-02-04',
      date_created: '2029-01-22T16:28:32.615Z',
    },
    {
      id: 4,
      user_name: 'test-user-4',
      full_name: 'Test user 4',
      password: 'password',
      notes: 'these are some test notes',
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

function makeMaliciousUser() {
  const maliciousUser = {
    id: 911,
    user_name: 'Naughty naughty very naughty <script>alert("xss");</script>',
    full_name: 'Naughty naughty very naughty <script>alert("xss");</script>',
    password: 'password',
    notes: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
    moving_date: '2029-02-04',
    date_created: '2029-01-22T16:28:32.615Z',
  }
  const expectedUser = {
    ...maliciousUser,
    user_name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    full_name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    notes: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  }
  return {
    maliciousUser,
    expectedUser
  }
}

function seedMaliciousUser(db, user) {
  return db.into('movingday_users').insert(user)
}

module.exports = {
  makeUsersArray,
  makeMovingdayFixtures,
  cleanTables,
  seedUsers,
  makeAuthHeader,
  makeMaliciousUser,
  seedMaliciousUser,
}