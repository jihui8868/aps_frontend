import { get, post, put, del } from './request'

export const deptApi = {
  list(params) {
    return get('/depts', params)
  },
  getById(id) {
    return get(`/depts/${id}`)
  },
  create(data) {
    return post('/depts', data)
  },
  update(id, data) {
    return put(`/depts/${id}`, data)
  },
  remove(id) {
    return del(`/depts/${id}`)
  },
}
