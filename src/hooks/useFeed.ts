'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import type { Profile } from '@/types'

const REQUEST_TIMEOUT_MS = 8000

interface FeedState {
  profiles: Profile[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

export function useFeed() {
  const { token } = useAuthStore()
  const [state, setState] = useState<FeedState>({
    profiles: [],
    loading: true,
    loadingMore: false,
    error: null,
    hasMore: false,
  })

  const requestNextProfile = useCallback(async (excludedIds: string[]): Promise<Profile | null> => {
    if (!token) return null

    const query = excludedIds.length > 0 ? `?exclude=${encodeURIComponent(excludedIds.join(','))}` : ''
    const res = await fetchWithTimeout(`/api/profiles/next${query}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 404) {
      return null
    }

    if (!res.ok) {
      throw new Error('Ошибка подгрузки анкеты')
    }

    const data = await res.json()
    return (data.profile ?? null) as Profile | null
  }, [token])

  const fetchFeed = useCallback(async () => {
    if (!token) return

    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const res = await fetchWithTimeout('/api/feed', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error('Ошибка загрузки ленты')
      }

      const data = await res.json()
      const profiles = (data.profiles ?? []) as Profile[]

      setState({
        profiles,
        loading: false,
        loadingMore: false,
        error: null,
        hasMore: data.hasMore ?? profiles.length > 0,
      })
    } catch {
      setState((current) => ({
        ...current,
        loading: false,
        loadingMore: false,
        error: 'Не удалось загрузить анкеты',
      }))
    }
  }, [token])

  const advanceAfterSwipe = useCallback(async (): Promise<boolean> => {
    if (!token) return false

    const currentProfiles = state.profiles
    if (currentProfiles.length === 0) return false

    setState((current) => ({ ...current, loadingMore: true, error: null }))

    const remainingProfiles = currentProfiles.slice(1)
    let nextProfile: Profile | null = null
    let nextFailed = false

    if (state.hasMore) {
      try {
        nextProfile = await requestNextProfile(currentProfiles.map((profile) => profile.user_id))
      } catch {
        nextFailed = true
      }
    }

    if (nextFailed && remainingProfiles.length === 0) {
      setState((current) => ({
        ...current,
        loadingMore: false,
        error: 'Не удалось подгрузить следующую анкету',
      }))
      return false
    }

    setState((current) => {
      const existingIds = new Set(remainingProfiles.map((profile) => profile.user_id))
      const nextProfiles = nextProfile && !existingIds.has(nextProfile.user_id)
        ? [...remainingProfiles, nextProfile]
        : remainingProfiles

      return {
        ...current,
        profiles: nextProfiles,
        loadingMore: false,
        hasMore: nextProfile ? true : false,
      }
    })

    return true
  }, [requestNextProfile, state.hasMore, state.profiles, token])

  useEffect(() => {
    void fetchFeed()
  }, [fetchFeed])

  return { ...state, refresh: fetchFeed, advanceAfterSwipe }
}
