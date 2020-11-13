const xss = require('xss')

const ContactsService = {
  getAllContactsByUserId(db, user_id) {
    return db('movingday_contacts')
      .select('*')
      .where({ user_id })
  },

  getContactById(db, id) {
    return db('movingday_contacts')
      .where({ id })
      .first()

  },

  insertContact(db, newContact) {
    return db
      .insert(newContact)
      .into('movingday_contacts')
      .returning('*')
      .then(([contact]) => contact)
  },

  updateContact(db, id, newContactFields) {
    return db('movingday_contacts')
      .where({ id })
      .update(newContactFields)
  },

  deleteContact(db, id) {
    return db('movingday_contacts')
      .where({ id })
      .delete()
  },

  serializeContact(contact) {
    return {
      id: contact.id,
      contact_name: xss(contact.contact_name),
      contact_phone: xss(contact.contact_phone),
      contact_email: xss(contact.contact_email),
      contact_notes: xss(contact.contact_notes),
      date_created: new Date(contact.date_created),
      user_id: contact.user_id
    }
  },

  serializeContacts(contacts) {
    return contacts.map(this.serializeContact)
  }
}

module.exports = ContactsService