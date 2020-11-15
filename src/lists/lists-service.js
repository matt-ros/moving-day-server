const xss = require('xss')

const ListsService = {
  getAllListsByUserId(db, user_id) {
    return db('movingday_lists')
      .select('*')
      .where({ user_id })
  },

  getListById(db, id) {
    return db('movingday_lists')
      .where({ id })
      .first()
  },

  insertList(db, newList) {
    return db
      .insert(newList)
      .into('movingday_lists')
      .returning('*')
      .then(([list]) => list)
  },

  updateList(db, id, newListFields) {
    return db('movingday_lists')
      .where({ id })
      .update(newListFields)
  },

  deleteList(db, id) {
    return db('movingday_lists')
      .where({ id })
      .delete()
  },

  serializeList(list) {
    return {
      id: list.id,
      list_name: xss(list.list_name),
      list_items: createListItems(list.list_items),
      date_created: new Date(list.date_created),
      user_id: list.user_id
    }
  },

  serializeLists(lists) {
    return lists.map(this.serializeList)
  }
}

function createListItems(rawItems) {
  if (rawItems === null) {
    return {}
  }
  const listItems = {}
  for (const key in rawItems) {
    listItems[xss(key)] = rawItems[key]
  }
  return listItems

}

module.exports = ListsService