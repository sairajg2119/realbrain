/** @type {import('next').NextConfig} */
const nextConfig = {
  // The brain files are read from disk at runtime, so make sure Vercel ships them with the API route.
  outputFileTracingIncludes: {
    "/api/analyze": ["./brain/**/*"],
  },
};

export default nextConfig;
