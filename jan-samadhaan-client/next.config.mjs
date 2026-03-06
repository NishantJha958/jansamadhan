/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').trim()}/:path*`,
      },
    ];
  },
};

export default nextConfig;
