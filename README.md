# AI Gateway Hub

One OpenAI-compatible API in front of **Groq, OpenRouter, Gemini and OpenAI (ChatGPT)**.
Users sign up, create their own gateway API key (`sk-gw-...`) and call real provider models through this site's endpoints.

- `POST /api/v1/chat/completions` (streaming supported)
- `GET  /api/v1/models` (live list, free models only for Groq / OpenRouter / Gemini)
- `GET  /api/v1/providers`

## Security model
- Supabase RLS is ON for every table. Anonymous visitors can read nothing.
- Logged-in users can read only their own rows; `key_hash` is not readable by clients.
- Gateway keys are stored only as SHA-256 hashes and shown once.
- Provider keys and the Supabase service-role key live only in Vercel environment variables.
- OpenRouter calls are allowed only for models that are live-verified as free ($0 pricing).
- Per-key limits: 30 requests/minute, 1000 requests/day, max 4096 output tokens.

## Environment variables
See `.env.example`. Set them in Vercel -> Project -> Settings -> Environment Variables.
