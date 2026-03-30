import { get, post, put, del } from './request'

export const dictApi = {
  listCategories(params) {
    return get('/dicts/categories', params)
  },
  listItems(params) {
    return get('/dicts/items', params)
  },
  createItem(data) {
    return post('/dicts/items', data)
  },
  updateItem(itemId, data) {
    return put(`/dicts/items/${itemId}`, data)
  },
  removeItem(itemId) {
    return del(`/dicts/items/${itemId}`)
  },
  updateItemStatus(itemId, data) {
    return put(`/dicts/items/${itemId}/status`, data)
  },
}
