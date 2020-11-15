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

  .post(jsonBodyParser, (req, res, next) => {
    const { list_name, list_items } = req.body
    if (!list_name) {
      return res.status(400).json({
        error: `Missing 'list_name' in request body`
      })
    }
    const newList = {
      list_name,
      list_items,
      date_created: 'now()',
      user_id: req.user.id
    }
    return ListsService.insertList(
      req.app.get('db'),
      newList
    )
      .then(list => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${list.id}`))
          .json(ListsService.serializeList(list))
      })
      .catch(next)
  })

module.exports = listsRouter