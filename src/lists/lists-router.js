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

listsRouter
  .route('/:id')
  .all(requireAuth)
  .all(checkListExists)
  .all(checkListBelongsToUser)
  .get((req, res) => {
    res.json(ListsService.serializeList(res.list))
  })

  .patch(jsonBodyParser, (req, res, next) => {
    const { list_name, list_items } = req.body
    const updateFields = { list_name, list_items }
    const numFields = Object.values(updateFields).filter(Boolean).length
    if (numFields === 0) {
      return res.status(400).json({ error: `Request body must contain 'list_name' or 'list_items'` })
    }

    ListsService.updateList(
      req.app.get('db'),
      req.params.id,
      updateFields
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

  .delete((req, res, next) => {
    ListsService.deleteList(
      req.app.get('db'),
      req.params.id
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

async function checkListExists(req, res, next) {
  try {
    const list = await ListsService.getListById(
      req.app.get('db'),
      req.params.id
    )
    if (!list) {
      return res.status(404).json({
        error: `List doesn't exist`
      })
    }
    res.list = list
    next()
  } catch (error) {
    next(error)
  }
}

async function checkListBelongsToUser(req, res, next) {
  if (res.list.user_id !== req.user.id) {
    return res.status(403).json({
      error: 'List belongs to a different user'
    })
  }
  next()
}

module.exports = listsRouter