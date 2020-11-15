const express = require('express')
const path = require('path')
const BoxesService = require('./boxes-service')
const { requireAuth } = require('../middleware/jwt-auth')

const boxesRouter = express.Router()
const jsonBodyParser = express.json()

boxesRouter
  .route('/')
  .all(requireAuth)
  .get((req, res, next) => {
    BoxesService.getAllBoxesByUserId(
      req.app.get('db'),
      req.user.id
    )
      .then(boxes => {
        res.json(BoxesService.serializeBoxes(boxes))
      })
      .catch(next)
  })

  module.exports = boxesRouter