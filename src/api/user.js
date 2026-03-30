import { get, post, put, del } from './request'

export const userApi = {
  list(params) {
    return get('/users', params)
  },
  getById(id) {
    return get(`/users/${id}`)
  },
  create(data) {
    return post('/users', data)
  },
  update(id, data) {
    return put(`/users/${id}`, data)
  },
  remove(id) {
    return del(`/users/${id}`)
  },
  resetPassword(id) {
    return post(`/users/${id}/reset-password`)
  },
  toggleStatus(id) {
    return post(`/users/${id}/toggle-status`)
  },
}
