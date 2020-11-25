const xss = require('xss')

const BoxesService = {
  getAllBoxesByUserId(db, user_id) {
    return db('movingday_boxes')
      .select('*')
      .where({ user_id })
  },

  getBoxById(db, id) {
    return db('movingday_boxes')
      .where({ id })
      .first()
  },

  insertBox(db, newBox) {
    return db
      .insert(newBox)
      .into('movingday_boxes')
      .returning('*')
      .then(([box]) => box)
  },

  updateBox(db, id, newBoxFields) {
    return db('movingday_boxes')
      .where({ id })
      .update(newBoxFields)
  },

  deleteBox(db, id) {
    return db('movingday_boxes')
      .where({ id })
      .delete()
  },

  serializeBox(box) {
    return {
      id: box.id,
      box_name: xss(box.box_name),
      coming_from: xss(box.coming_from),
      going_to: xss(box.going_to),
      getting_there: xss(box.getting_there),
      color_code: xss(box.color_code),
      box_notes: xss(box.box_notes),
      inventory: box.inventory === null ? [] : box.inventory.map(item => xss(item)),
      date_created: new Date(box.date_created),
      user_id: box.user_id
    }
  },

  serializeBoxes(boxes) {
    return boxes.map(this.serializeBox)
  }
}

module.exports = BoxesService