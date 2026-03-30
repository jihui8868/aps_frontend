import { get, post, put, del } from './request'

export const orderApi = {
  list(params) {
    return get('/orders', params)
  },
  getById(id) {
    return get(`/orders/${id}`)
  },
  create(data) {
    return post('/orders', data)
  },
  update(id, data) {
    return put(`/orders/${id}`, data)
  },
  remove(id) {
    return del(`/orders/${id}`)
  },
}
