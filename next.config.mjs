/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone' — habilitado apenas no Dockerfile via NEXT_OUTPUT=standalone
  // Na Vercel, não usar standalone (ela gerencia o deploy automaticamente)
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
