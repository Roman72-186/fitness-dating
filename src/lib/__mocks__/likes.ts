import type { LikeParsed } from '@/lib/watbot-types'

export const mockLikes: LikeParsed[] = [
  {
    from_user_id: '1001',
    to_user_id: '9999',
    is_viewed: false,
    timestamp: '2026-04-23T10:00:00.000Z',
  },
  {
    from_user_id: '1002',
    to_user_id: '9999',
    is_viewed: false,
    timestamp: '2026-04-23T11:00:00.000Z',
  },
  {
    from_user_id: '1003',
    to_user_id: '9999',
    is_viewed: true,
    timestamp: '2026-04-22T09:00:00.000Z',
  },
]
