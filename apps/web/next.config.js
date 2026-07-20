/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@founderos/core", "@founderos/db"],
};

module.exports = nextConfig;
