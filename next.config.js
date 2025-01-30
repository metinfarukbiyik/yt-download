/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"]
    }
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'ytdl-core': require.resolve('ytdl-core'),
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      stream: require.resolve('stream-browserify'),
    };
    return config;
  },
  serverless: {
    functions: {
      'api/download': {
        maxDuration: 60
      }
    }
  }
}

module.exports = nextConfig 