const express = require('express')
const path = require('path')
const ContactsService = require('./contacts-service')
const { requireAuth } = require('../middleware/jwt-auth')

const contactsRouter = express.Router()
const jsonBodyParser = express.json()

contactsRouter
  .route('/')
  .all(requireAuth)
  .get((req, res, next) => {
    ContactsService.getAllContactsByUserId(
      req.app.get('db'),
      req.user.id
    )
      .then(contacts => {
        res.json(ContactsService.serializeContacts(contacts))
      })
      .catch(next)
  })

  .post(jsonBodyParser, (req, res, next) => {
    const { contact_name, contact_phone, contact_email, contact_notes } = req.body
    if (!contact_name) {
      return res.status(400).json({
        error: `Missing 'contact_name' in request body`
      })
    }

    const newContact = {
      contact_name,
      contact_phone,
      contact_email,
      contact_notes,
      date_created: 'now()',
      user_id: req.user.id
    }
    return ContactsService.insertContact(
      req.app.get('db'),
      newContact
    )
      .then(contact => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${contact.id}`))
          .json(ContactsService.serializeContact(contact))
      })
      .catch(next)
  })

contactsRouter
  .route('/:id')
  .all(requireAuth)
  .all(checkContactExists)
  .all(checkContactBelongsToUser)
  .get((req, res) => {
    res.json(ContactsService.serializeContact(res.contact))
  })

  .patch(jsonBodyParser, (req, res, next) => {
    const { contact_name, contact_phone, contact_email, contact_notes } = req.body
    const updateFields = { contact_name, contact_phone, contact_email, contact_notes }
    const numFields = Object.values(updateFields).filter(Boolean).length
    if (numFields === 0) {
      return res.status(400).json({ error: `Request body must contain one of 'contact_name', 'contact_phone', 'contact_email', or 'contact_notes'` })
    }

    ContactsService.updateContact(
      req.app.get('db'),
      req.params.id,
      updateFields
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

async function checkContactExists(req, res, next) {
  try {
    const contact = await ContactsService.getContactById(
      req.app.get('db'),
      req.params.id
    )
    if (!contact) {
      return res.status(404).json({
        error: `Contact doesn't exist`
      })
    }
    res.contact = contact
    next()
  } catch (error) {
    next(error)
  }
}

async function checkContactBelongsToUser(req, res, next) {
  try {
    if (res.contact.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Contact belongs to a different user'
      })
    }
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = contactsRouter