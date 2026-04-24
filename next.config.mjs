/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: '**.telegram.org',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      // Добавить домен хранилища фото WATBOT при необходимости
    ],
  },
}

export default nextConfig
