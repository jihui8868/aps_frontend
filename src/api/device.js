import { get, post, put, del } from './request'

export const deviceApi = {
  list(params) {
    return get('/devices', params)
  },
  getById(id) {
    return get(`/devices/${id}`)
  },
  create(data) {
    return post('/devices', data)
  },
  update(id, data) {
    return put(`/devices/${id}`, data)
  },
  remove(id) {
    return del(`/devices/${id}`)
  },
}
