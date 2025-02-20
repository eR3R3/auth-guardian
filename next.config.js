/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: "build/app",
  images: {
    unoptimized: true,
  }
}

module.exports = nextConfig 