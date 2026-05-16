# Ethnic Tryon — Virtual Fitting Room

A mobile-first AI-powered virtual try-on app for women's ethnic streetwear. Built for showroom salesmen: upload two photos, tap one button, get a photorealistic fitting result.

**100% free to run** — uses the [IDM-VTON](https://huggingface.co/yisol/IDM-VTON) model hosted on Hugging Face Spaces. No API key or credit card required.

## How It Works

1. **Customer Photo** — salesman snaps or uploads a front-facing customer photo
2. **Garment Photo** — flat-lay or hanger shot of the ethnic outfit
3. **Select Category** — Full Dress / Upper Body / Lower Body / Auto
4. **Execute Try-On** — the app calls IDM-VTON on HF with pre-tuned ethnic fabric parameters

No text prompting. Garment descriptions are pre-programmed per category. Processing takes ~60–90 seconds on the free tier.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. That's it — works without any env variables.

## Optional: Hugging Face Token

Adding a free HF token gives you better rate limits and avoids queue delays on busy days.

1. Go to https://huggingface.co/settings/tokens → create a Read token
2. Copy `.env.example` to `.env.local` and paste your token

```bash
cp .env.example .env.local
# edit .env.local → HF_TOKEN=hf_xxxx
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `HF_TOKEN` | No | HF read token for better rate limits |

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **IDM-VTON** via Hugging Face Spaces (`yisol/IDM-VTON`) — free, no card needed

## Deploy

```bash
npm run build
```

Deploy to Vercel or any Node.js host. Set `HF_TOKEN` in environment secrets (optional).
