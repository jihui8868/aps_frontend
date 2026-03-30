import { get, post, put, del } from './request'

export const roleApi = {
  list(params) {
    return get('/roles', params)
  },
  getById(id) {
    return get(`/roles/${id}`)
  },
  create(data) {
    return post('/roles', data)
  },
  update(id, data) {
    return put(`/roles/${id}`, data)
  },
  remove(id) {
    return del(`/roles/${id}`)
  },
}
