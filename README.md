# Ethnic Tryon — Virtual Fitting Room

A mobile-first AI-powered virtual try-on app for women's ethnic streetwear. Built for showroom salesmen: upload two photos, tap one button, get a photorealistic fitting result.

## How It Works

1. **Customer Photo** — salesman snaps or uploads a front-facing customer photo
2. **Garment Photo** — flat-lay or hanger shot of the ethnic outfit
3. **Select Category** — Full Dress / Upper Body / Lower Body / Auto
4. **Execute Try-On** — the app calls [Fashn.ai](https://fashn.ai) with pre-tuned parameters for ethnic fabric fidelity, drape, and showroom lighting

No text prompting needed. Everything is pre-programmed under the hood.

## Setup

```bash
npm install
cp .env.example .env.local
# Add your Fashn.ai key to .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Variable | Description |
|---|---|
| `FASHN_API_KEY` | Your Fashn.ai API key — get it at [fashn.ai](https://fashn.ai) |

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **Fashn.ai API** — virtual garment try-on with fabric intelligence

## Deploy

```bash
npm run build
```

Deploy to Vercel or any Node.js host. Set `FASHN_API_KEY` in your environment/secrets.
