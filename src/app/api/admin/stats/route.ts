import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/admin-auth'

type GroupRow = {
  name: string
  count: number
}

function getToken(req: NextRequest): string | null {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? null
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function normalizeGroupName(value: string | null): string {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : 'Не указано'
}

async function countSince(days: number, where: Prisma.UserWhereInput): Promise<number> {
  return await prisma.user.count({
    where: {
      ...where,
      created_at: { gte: daysAgo(days) },
    },
  })
}

async function groupByField(field: 'city' | 'club', where: Prisma.UserWhereInput): Promise<GroupRow[]> {
  const rows = await prisma.user.groupBy({
    by: [field],
    where,
    _count: { _all: true },
    orderBy: { _count: { [field]: 'desc' } },
  })

  return rows.map((row) => ({
    name: normalizeGroupName(row[field]),
    count: row._count._all,
  }))
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const allowed = await verifyAdminToken(getToken(req))

  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', message: 'Нет доступа' },
      { status: 401 },
    )
  }

  const where: Prisma.UserWhereInput = {}

  const [day1, day7, day15, day30, byCity, byClub, male, female] = await Promise.all([
    countSince(1, where),
    countSince(7, where),
    countSince(15, where),
    countSince(30, where),
    groupByField('city', where),
    groupByField('club', where),
    prisma.user.count({ where: { ...where, gender: 'male' } }),
    prisma.user.count({ where: { ...where, gender: 'female' } }),
  ])

  return NextResponse.json({
    ok: true,
    stats: {
      periods: {
        day1,
        day7,
        day15,
        day30,
      },
      byCity,
      byClub,
      byGender: {
        male,
        female,
      },
    },
  })
}
