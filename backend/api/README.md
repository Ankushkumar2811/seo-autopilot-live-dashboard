# API layer

Vercel entrypoints remain in the root `api/` directory. They should become thin adapters that call services in `backend/services`, use validators and middleware, and preserve stable public response contracts.
