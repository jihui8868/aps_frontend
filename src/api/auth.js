import { post, get } from './request'

export const authApi = {
  login(data) {
    return post('/auth/login', data)
  },
  logout() {
    return post('/auth/logout')
  },
  getCurrentUser() {
    return get('/auth/me')
  },
}
