import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // OPTIMIZATION: Image optimization settings
  images: {
    formats: ['image/avif', 'image/webp'], // Modern image formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Responsive breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon sizes
    minimumCacheTTL: 60, // Cache images for 60 seconds minimum
    domains: ['localhost'], // Add Supabase domain if using remote images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Allow all Supabase domains
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Enable optimization in production, can keep unoptimized for dev if needed
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // OPTIMIZATION: Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error/warn logs in production
    } : false,
  },
  
  // OPTIMIZATION: React strict mode for better performance
  reactStrictMode: true,
  
  // OPTIMIZATION: Reduce bundle size
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
  
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // OPTIMIZATION: Reduce bundle size by excluding source maps in production
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.devtool = false;
    }
    
    return config;
  },
  
  // OPTIMIZATION: Enhanced security and performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      // OPTIMIZATION: Cache static assets aggressively
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // OPTIMIZATION: Cache images
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // OPTIMIZATION: Cache fonts
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
