const express = require('express')
const path = require('path')
const ListsService = require('./lists-service')
const { requireAuth } = require('../middleware/jwt-auth')

const listsRouter = express.Router()
const jsonBodyParser = express.json()

listsRouter
  .route('/')
  .all(requireAuth)
  .get((req, res, next) => {
    ListsService.getAllListsByUserId(
      req.app.get('db'),
      req.user.id
    )
      .then(lists => {
        res.json(ListsService.serializeLists(lists))
      })
      .catch(next)
  })

  

module.exports = listsRouter