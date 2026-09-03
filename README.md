# Energy-i web app

Vite + React 19 + TypeScript front-end for **Energy-i**. It has no direct
database access — all data and authentication are served by the platform API
(`../platform/apps/api`).

## Architecture

- **Web app (this repo)** — Vite SPA, TanStack Router (file-based), TanStack
  Query, Better Auth client, shadcn/ui, Tailwind v4.
- **Platform API (Hono)** — owns Prisma, the database and Better Auth. Exposed
  at `http://localhost:3001/v1`.

In dev the Vite server proxies same-origin `/api/*` to the API so session
cookies stay on the web-app host:

```
/api/:path*  ->  ${API_BASE_URL}/:path*   (default: http://localhost:3001/v1)
```

In production, set `VITE_API_BASE_URL` to the API's public URL. The API must
send CORS headers and allow cross-site cookies.

## Getting started

1. Start the platform API (see `apps/api/README.md`).
2. Install dependencies and run the dev server:

   ```
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the Vite dev server on port 3000.
- `npm run build` — production build.
- `npm run preview` — preview the production build locally.
- `npm run lint` — lint the codebase.
- `npm run typecheck` — regenerate the route tree and run `tsc --noEmit`.
- `npm run generate:routes` — regenerate `src/routeTree.gen.ts`.
