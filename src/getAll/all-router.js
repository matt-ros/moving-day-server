const express = require('express')
const BoxesService = require('../boxes/boxes-service')
const ContactsService = require('../contacts/contacts-service')
const ListsService = require('../lists/lists-service')
const UsersService = require('../users/users-service')
const { requireAuth } = require('../middleware/jwt-auth')

const getAllRouter = express.Router()

getAllRouter
  .route('/')
  .get(requireAuth, getBoxes, getContacts, getLists, getUser, (req, res, next) => {
    res.json({
      user: UsersService.serializeUser(res.user),
      boxes: BoxesService.serializeBoxes(res.boxes),
      contacts: ContactsService.serializeContacts(res.contacts),
      lists: ListsService.serializeLists(res.lists)
    })
  })

async function getContacts(req, res, next) {
  try {
    const contacts = await ContactsService.getAllContactsByUserId(
      req.app.get('db'),
      req.user.id
    )
    res.contacts = contacts
    next()
  } catch (error) {
    next(error)
  }
}

async function getLists(req, res, next) {
  try {
    const lists = await ListsService.getAllListsByUserId(
      req.app.get('db'),
      req.user.id
    )
    res.lists = lists
    next()
  } catch (error) {
    next(error)
  }
}

async function getUser(req, res, next) {
  try {
    const user = await UsersService.getUserById(
      req.app.get('db'),
      req.user.id
    )
    res.user = user
    next()
  } catch (error) {
    next(error)
  }
}

async function getBoxes(req, res, next) {
  try {
    const boxes = await BoxesService.getAllBoxesByUserId(
      req.app.get('db'),
      req.user.id
    )
    res.boxes = boxes
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = getAllRouter
