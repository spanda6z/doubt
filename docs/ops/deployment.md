# Deployment

## Production (Vercel)

### Prerequisites

- GitHub repo access  
- Vercel project with **Root Directory** = `web`  

### Steps

1. Import repository on [vercel.com/new](https://vercel.com/new)  
2. Set Root Directory to `web`  
3. Framework preset: **Next.js**  
4. Add environment variables (optional but recommended):

| Variable | Required | Description |
|----------|----------|-------------|
| `HELIUS_API_KEY` | No | Metadata via Helius |
| `BIRDEYE_API_KEY` | No | Token overview |
| `NEXT_PUBLIC_API_BASE` | No | Only if API is hosted elsewhere |

5. Deploy  

### Domains

Attach a custom domain in the Vercel project settings.  
Brand targets: `.sol` / `.xyz` when available.

### Health checks

- `GET /` — discovery UI  
- `GET /api/v1/radar?tab=radar&limit=5` — JSON feed  
- `GET /api/v1/verdict/<valid-mint>` — verdict JSON  

## Local development

```bash
cd web
npm install
npm run dev
```

## Rollback

Use Vercel Deployments → promote a previous production deployment.

## Observability (planned)

- Structured logs on API routes  
- Error tracking (e.g. Sentry)  
- Public status page  

## Secrets

Never commit API keys. Rotate keys if exposed. Prefer Vercel encrypted env vars.
