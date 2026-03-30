import { get, post, put, del } from './request'

export const productApi = {
  list(params) {
    return get('/products', params)
  },
  getById(id) {
    return get(`/products/${id}`)
  },
  create(data) {
    return post('/products', data)
  },
  update(id, data) {
    return put(`/products/${id}`, data)
  },
  remove(id) {
    return del(`/products/${id}`)
  },
}
