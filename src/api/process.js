import { get, post, put, del } from './request'

export const processApi = {
  list(params) {
    return get('/processes', params)
  },
  getById(id) {
    return get(`/processes/${id}`)
  },
  create(data) {
    return post('/processes', data)
  },
  update(id, data) {
    return put(`/processes/${id}`, data)
  },
  remove(id) {
    return del(`/processes/${id}`)
  },
}
