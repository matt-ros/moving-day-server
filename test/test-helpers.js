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

function makeContactsArray(users) {
  return [
    {
      id: 1,
      contact_name: 'test-contact-1',
      contact_phone: '123-456-7890',
      contact_email: 'test1@testemail.com',
      contact_notes: 'these are some test notes for the contact',
      date_created: '2029-01-22T16:28:32.615Z',
      user_id: users[0].id
    },
    {
      id: 2,
      contact_name: 'test-contact-2',
      contact_phone: '234-567-8901',
      contact_email: 'test2@testemail.com',
      contact_notes: 'these are some test notes for the contact',
      date_created: '2029-01-22T16:28:32.615Z',
      user_id: users[3].id
    },
    {
      id: 3,
      contact_name: 'test-contact-3',
      contact_phone: '345-678-9012',
      contact_email: 'test3@testemail.com',
      contact_notes: 'these are some test notes for the contact',
      date_created: '2029-01-22T16:28:32.615Z',
      user_id: users[0].id
    },
    {
      id: 4,
      contact_name: 'test-contact-4',
      contact_phone: '456-789-0123',
      contact_email: 'test4@testemail.com',
      contact_notes: 'these are some test notes for the contact',
      date_created: '2029-01-22T16:28:32.615Z',
      user_id: users[2].id
    },
  ]
}

function makeMovingdayFixtures() {
  const testUsers = makeUsersArray()
  const testContacts = makeContactsArray(testUsers)
  return { testUsers, testContacts }
}

function cleanTables(db) {
  return db.raw(
    `TRUNCATE
      movingday_users,
      movingday_contacts
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

function seedMovingdayTables(db, users, contacts) { // add other tables as created
  // use a transaction to group queries and auto rollback on failure
  return db.transaction(async trx => {
    await seedUsers(trx, users)
    await trx.into('movingday_contacts').insert(contacts)
    // update auto sequence to match forced id values
    await trx.raw(
      `SELECT setval('movingday_contacts_id_seq', ?)`,
      [contacts[contacts.length - 1].id],
    )
  })
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

function makeMaliciousContact(user) {
  const maliciousContact = {
    id: 911,
    contact_name: 'Naughty naughty very naughty <script>alert("xss");</script>',
    contact_phone: 'Naughty naughty very naughty <script>alert("xss");</script>',
    contact_email: 'Naughty naughty very naughty <script>alert("xss");</script>',
    contact_notes: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
    date_created: new Date().toISOString(),
    user_id: user.id
  }
  const expectedContact = {
    ...maliciousContact,
    contact_name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    contact_phone: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    contact_email: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    contact_notes: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  }
  return {
    maliciousContact,
    expectedContact
  }
}

function seedMaliciousUser(db, user) {
  return db.into('movingday_users').insert(user)
}

function seedMaliciousContact(db, user, contact) {
  return seedUsers(db, [user])
    .then(() =>
      db
        .into('movingday_contacts')
        .insert([contact])
  )
}

module.exports = {
  makeUsersArray,
  makeContactsArray,
  makeMovingdayFixtures,
  cleanTables,
  seedUsers,
  seedMovingdayTables,
  makeAuthHeader,
  makeMaliciousUser,
  seedMaliciousUser,
  makeMaliciousContact,
  seedMaliciousContact,
}