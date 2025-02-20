/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: "build/app",
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Accept' },
        ],
      },
    ]
  }
}

module.exports = nextConfig