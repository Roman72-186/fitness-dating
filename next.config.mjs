/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/feed',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/likes',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/matches',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/profile',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        // локальная раздача фото через nginx fm_photos, путь /photos
        protocol: 'https',
        hostname: 'fit.assaru.space',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'storage.watbot.ru',
      },
      {
        // legacy TimeWeb, ссылок в базе больше нет
        protocol: 'https',
        hostname: 's3.twcstorage.ru',
      },
      {
        // Object Storage Selectel, текущее место загрузки новых фото
        protocol: 'https',
        hostname: 'b44804bc-6e86-40e5-81a2-cc3f55833f90.selstorage.ru',
      },
      {
        protocol: 'https',
        hostname: '**.telegram.org',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

export default nextConfig
