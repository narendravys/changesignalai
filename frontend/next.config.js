/** @type {import('next').NextConfig} */
const nextConfig = {
  // use standalone only for production build (next build)
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000',
    API_VERSION: process.env.API_VERSION || 'v1',
  },
  // In Docker, polling can help if file watching fails (re-enable if needed)
  // webpack: (config, { dev }) => {
  //   if (dev) {
  //     config.watchOptions = { poll: 1000, aggregateTimeout: 300 };
  //   }
  //   return config;
  // },
}

module.exports = nextConfig
