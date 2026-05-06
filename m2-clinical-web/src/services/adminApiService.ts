/**
 * adminApiService — admin-only API operations.
 * Requires a valid admin JWT (stored via authStore).
 */

import type { ApiPatient } from '../types/api'
import { authStore } from './authStore'

const BASE_URL = 'http://113.44.220.94:3000'

async function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authStore.getAuthHeaders(),
    },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[Admin API] ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
  }
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (null as T)
}

export const adminApiService = {
  /** GET /users — all users */
  async listAllUsers(): Promise<ApiPatient[]> {
    return adminFetch<ApiPatient[]>('/users')
  },

  /** GET /users/:id — single user (may include license fields) */
  async getUserById(id: number): Promise<unknown> {
    return adminFetch<unknown>(`/users/${id}`)
  },

  /** GET /users filtered to clinicians with status=pending */
  async listPendingClinicians(): Promise<ApiPatient[]> {
    const users = await adminApiService.listAllUsers()
    return users.filter((u) => u.role === 'clinician' && u.status === 'pending')
  },

  /** PATCH /auth/approve/:userId */
  async approveClinician(userId: number): Promise<void> {
    return adminFetch<void>(`/auth/approve/${userId}`, { method: 'PATCH' })
  },
}

