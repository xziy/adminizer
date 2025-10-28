# Next.js Integration Guide

This guide helps you integrate Adminizer with Next.js applications, especially when using standalone build mode.

## Quick Start

### 1. Install Adminizer

```bash
npm install adminizer
# or
pnpm add adminizer
# or
yarn add adminizer
```

### 2. Configure Next.js for Standalone Build

**Important:** If you're using Next.js with `output: "standalone"`, you must configure Next.js to include Adminizer files in the build.

Create or update your `next.config.mjs`:

```javascript
/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/adminizer/**/*"
      ]
    },
  },
};

export default nextConfig;
```

**What this does:**
- `outputFileTracingIncludes` tells Next.js to include all Adminizer files (assets, controllers, translations, icons) in the standalone build
- `/api/**/*` applies this rule to all API routes (adjust if your Adminizer route is different)

### 3. Create API Route

Create a catch-all API route for Adminizer:

#### Pages Router

Create `pages/api/adminizer/[[...adminizer]].ts`:

```typescript
import { Adminizer } from 'adminizer';
import type { NextApiRequest, NextApiResponse } from 'next';
import { DataSource } from 'typeorm';

// Initialize your database connection
const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'database.sqlite',
  synchronize: true,
  logging: false,
  entities: [/* your entities */],
});

let adminizer: Adminizer | null = null;

async function getAdminizer() {
  if (!adminizer) {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    adminizer = new Adminizer({
      // Your configuration here
      routePrefix: '/api/adminizer',
      models: {
        // Your models configuration
      },
    });

    await adminizer.init(AppDataSource);
  }
  return adminizer;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const admin = await getAdminizer();
    const middleware = admin.getMiddleware();

    return new Promise((resolve) => {
      middleware(req as any, res as any, (err: any) => {
        if (err) {
          console.error('Adminizer middleware error', err);
          res.status(500).json({ error: err.message });
          return resolve(undefined);
        }
        resolve(undefined);
      });
    });
  } catch (error) {
    console.error('Adminizer initialization error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### App Router

Create `app/api/adminizer/[[...adminizer]]/route.ts`:

```typescript
import { Adminizer } from 'adminizer';
import { NextRequest, NextResponse } from 'next/server';
import { DataSource } from 'typeorm';

// Similar initialization as above

export async function GET(request: NextRequest) {
  // Handle GET requests
}

export async function POST(request: NextRequest) {
  // Handle POST requests
}

export async function PUT(request: NextRequest) {
  // Handle PUT requests
}

export async function DELETE(request: NextRequest) {
  // Handle DELETE requests
}
```

## Docker Configuration

### Dockerfile for Next.js Standalone

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Note: With outputFileTracingIncludes configured, 
# Adminizer files are automatically included in .next/standalone/node_modules/adminizer

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
      - AP_PASSWORD_SALT=your-secret-salt-here
    depends_on:
      - db
    volumes:
      - ./database.sqlite:/app/database.sqlite # For SQLite
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Environment Variables

Create a `.env.local` file in your Next.js project:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/myapp

# Adminizer
AP_PASSWORD_SALT=your-very-secret-salt-here

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Troubleshooting

### Assets Not Loading (404 errors)

**Problem:** CSS/JS files return 404 errors like `/api/adminizer/assets/app-*.css`

**Solution:** Ensure you've added `outputFileTracingIncludes` to your `next.config.mjs` as shown above.

### Controllers Not Found

**Problem:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/node_modules/adminizer/controllers/addUser.js'`

**Solution:** 
1. Upgrade to Adminizer v4.4.0+ (which includes automatic path fallback)
2. Ensure `outputFileTracingIncludes` is properly configured in `next.config.mjs`

### Database Connection Issues

Make sure your database is properly initialized before calling `adminizer.init()`:

```typescript
if (!AppDataSource.isInitialized) {
  await AppDataSource.initialize();
}
```

### Session Issues

If you're having session problems, ensure you've set a proper session secret:

```typescript
const adminizer = new Adminizer({
  // ... other config
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  },
});
```

## Additional Resources

- [Adminizer Documentation](https://adminizer.github.io)
- [Troubleshooting Guide](./Troubleshooting.md)
- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
