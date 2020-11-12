const express = require('express')
const path = require('path')
const UsersService = require('./users-service')
const { requireAuth } = require('../middleware/jwt-auth')
const { serializeUser } = require('./users-service')


const usersRouter = express.Router()
const jsonBodyParser = express.json()

usersRouter
  .route('/')
  .post(jsonBodyParser, (req, res, next) => {
    const { user_name, full_name, password, notes, moving_date } = req.body

    for (const field of ['full_name', 'user_name', 'password']) {
      if (!req.body[field]) {
        return res.status(400).json({
          error: `Missing '${field}' in request body`
        })
      }
    }

    const passwordError = UsersService.validatePassword(password)

    if (passwordError) {
      return res.status(400).json({ error: passwordError })
    }

    UsersService.hasUserWithUserName(
      req.app.get('db'),
      user_name
    )
      .then(hasUserWithUserName => {
        if (hasUserWithUserName) {
          return res.status(400).json({ error: 'Username already taken' })
        }

        return UsersService.hashPassword(password)
          .then(hashedPassword => {
            const newUser = {
              user_name,
              password: hashedPassword,
              full_name,
              notes,
              moving_date,
              date_created: 'now()'
            }

            return UsersService.insertUser(
              req.app.get('db'),
              newUser
            )
              .then(user => {
                res
                  .status(201)
                  .location(path.posix.join(req.originalUrl, `/${user.id}`))
                  .json(UsersService.serializeUser(user))
              })
          })
      })
      .catch(next)
  })

  .patch(requireAuth, jsonBodyParser, (req, res, next) => {
    const { moving_date, notes } = req.body
    const userUpdateFields = { moving_date, notes }
    const numFields = Object.values(userUpdateFields).filter(Boolean).length;
    if (numFields === 0) {
      return res.status(400).json({ error: `Request body must contain 'moving_date' or 'notes'` })
    }

    UsersService.updateUser(
      req.app.get('db'),
      req.user.id,
      userUpdateFields
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

  .get(requireAuth, (req, res, next) => {
    return res.json(serializeUser(req.user))
  })

module.exports = usersRouter