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

  .post(jsonBodyParser, (req, res, next) => {
    const { box_name, coming_from, going_to, getting_there, color_code, box_notes, inventory } = req.body
    if (!box_name) {
      return res.status(400).json({
        error: `Missing 'box_name' in request body`
      })
    }
    const newBox = {
      box_name,
      coming_from,
      going_to,
      getting_there,
      color_code,
      box_notes,
      inventory,
      date_created: 'now()',
      user_id: req.user.id
    }
    return BoxesService.insertBox(
      req.app.get('db'),
      newBox
    )
      .then(box => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${box.id}`))
          .json(BoxesService.serializeBox(box))
      })
      .catch(next)
  })

boxesRouter
  .route('/:id')
  .all(requireAuth)
  .all(checkBoxExists)
  .all(checkBoxBelongsToUser)
  .get((req, res) => {
    res.json(BoxesService.serializeBox(res.box))
  })

  .patch(jsonBodyParser, (req, res, next) => {
    const { box_name, coming_from, going_to, getting_there, color_code, box_notes, inventory } = req.body
    const updateFields = { box_name, coming_from, going_to, getting_there, color_code, box_notes, inventory }
    const numFields = Object.values(updateFields).filter(Boolean).length
    if (numFields === 0) {
      return res.status(400).json({
        error: `Request body must contain one of 'box_name', 'coming_from', 'going_to', 'getting_there', 'color_code', 'box_notes', or 'inventory'`
      })
    }

    BoxesService.updateBox(
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
    BoxesService.deleteBox(
      req.app.get('db'),
      req.params.id
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

async function checkBoxExists(req, res, next) {
  try {
    const box = await BoxesService.getBoxById(
      req.app.get('db'),
      req.params.id
    )
    if (!box) {
      return res.status(404).json({
        error: `Box doesn't exist`
      })
    }
    res.box = box
    next()
  } catch (error) {
    next(error)
  }
}

async function checkBoxBelongsToUser(req, res, next) {
  if (res.box.user_id !== req.user.id) {
    return res.status(403).json({
      error: 'Box belongs to a different user'
    })
  }
  next()
}

  module.exports = boxesRouter