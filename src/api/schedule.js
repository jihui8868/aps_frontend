import { get, post, del } from './request'

export const scheduleApi = {
  list(params) {
    return get('/schedules', params)
  },
  getById(id) {
    return get(`/schedules/${id}`)
  },
  create(data) {
    return post('/schedules', data)
  },
  remove(id) {
    return del(`/schedules/${id}`)
  },
  clearAll() {
    return del('/schedules')
  },
}
