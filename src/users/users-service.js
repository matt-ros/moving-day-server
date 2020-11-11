const xss = require('xss')
const bcrypt = require('bcryptjs')

const REGEX_UPPER_LOWER_NUMBER_SPECIAL = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&])[\S]+/

const UsersService = {
  hasUserWithUserName(db, user_name) {
    return db('movingday_users')
      .where({ user_name })
      .first()
      .then(user => !!user)
  },

  insertUser(db, newUser) {
    return db
      .insert(newUser)
      .into('movingday_users')
      .returning('*')
      .then(([user]) => user)
  },

  updateUser(knex, id, newUserFields) {
    return knex('movingday_users')
      .where({ id })
      .update(newUserFields)
  },

  validatePassword(password) {
    if (password.length < 8) {
      return 'Password must be longer than 8 characters'
    }
    if (password.length > 72) {
      return 'Password must be less than 72 characters'
    }
    if (password.startsWith(' ') || password.endsWith(' ')) {
      return 'Password must not start or end with empty space'
    }
    if (!REGEX_UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
      return 'Password must contain at least 1 upper case letter, lower case letter, number, and special character'
    }
    return null
  },

  hashPassword(password) {
    return bcrypt.hash(password, 12)
  },

  serializeUser(user) {
    return {
      id: user.id,
      full_name: xss(user.full_name),
      user_name: xss(user.user_name),
      moving_date: new Date(user.moving_date),
      date_created: new Date(user.date_created)
    }
  }
}

module.exports = UsersService