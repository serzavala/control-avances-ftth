const BASE = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud')
  return data
}

// Auth
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })

// Planes
export const getPlans = () => request('/plans')
export const getPlan  = (id) => request(`/plans/${id}`)
export const createPlan = (data) =>
  request('/plans', { method: 'POST', body: JSON.stringify(data) })
export const deletePlan = (id) =>
  request(`/plans/${id}`, { method: 'DELETE' })

// Progreso
export const getProgress = (id) => request(`/progress/${id}`)
export const patchProgress = (id, type, itemId, value) =>
  request(`/progress/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ type, itemId, value }),
  })
export const resetProgress = (id) =>
  request(`/progress/${id}`, { method: 'DELETE' })
