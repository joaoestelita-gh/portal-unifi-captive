/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Erros de tipo devem falhar o build (gate de qualidade restaurado).
  // Rode `pnpm typecheck` localmente para diagnosticar antes do build.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
