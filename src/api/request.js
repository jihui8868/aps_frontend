const BASE_URL = '/api'

async function request(url, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export function get(url, params) {
  let query = ''
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value)
      }
    })
    query = `?${searchParams.toString()}`
  }
  return request(`${url}${query}`, { method: 'GET' })
}

function cleanData(data) {
  if (!data || typeof data !== 'object') return data
  const cleaned = {}
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] = value === '' ? null : value
  }
  return cleaned
}

export function post(url, data) {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(cleanData(data)),
  })
}

export function put(url, data) {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(cleanData(data)),
  })
}

export function del(url) {
  return request(url, { method: 'DELETE' })
}
