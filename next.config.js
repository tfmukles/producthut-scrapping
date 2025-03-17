/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Disable experimental features that might cause signal handling issues
    serverActions: false,
  },
  // Add proper exit handling
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
