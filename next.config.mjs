/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mapbox GL JS uses browser APIs not available in SSR
  // We import it dynamically where needed
};

export default nextConfig;
