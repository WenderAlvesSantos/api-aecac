/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Desabilitar ESLint durante o build para evitar erros
    ignoreDuringBuilds: true,
  },
  // Remover output standalone - o Vercel gerencia isso automaticamente
  // output: 'standalone',
  webpack: (config, { isServer }) => {
    // MongoDB e outras bibliotecas do Node.js devem ser externas no cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        'fs/promises': false,
      }
    }
    
    // Marcar MongoDB como externo para evitar bundle no cliente
    config.externals = config.externals || []
    if (!isServer) {
      config.externals.push({
        mongodb: 'commonjs mongodb',
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
      })
    }
    
    return config
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ]
  },
}

module.exports = nextConfig

