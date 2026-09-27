# Contributing

Thank you for interest in Doubt.

## Product constraints

Before proposing a feature, confirm it answers:

> *What will this cost me if I'm wrong?*

We will **reject** PRs that add:

- Wallet connection  
- Swap / trade execution  
- Undisclosed paid ranking  
- Pure hype or “gem” surfaces without exit cost  

## Development

```bash
cd web
npm install
npm run dev
```

Python path (optional):

```bash
pip install -r requirements.txt
pytest
```

## Pull requests

1. Fork and branch from `main`  
2. Keep changes focused  
3. Update docs when behavior changes  
4. Describe user impact in the PR body  

## Code style

- TypeScript strict in `web/`  
- Prefer clarity over cleverness in scoring code  
- Comments for non-obvious formula choices  

## Security

See [docs/security/security.md](docs/security/security.md). Do not file public issues with exploit details.
