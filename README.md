# Word Research

Merlin Bird ID, but for words. Spot new words before they go mainstream.

## Setup

```bash
cd app
cp .env.example .env
# Fill in Google OAuth credentials and AUTH_SECRET
npm install
npm run dev
```

### Google OAuth

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (and your production domain)
4. Copy Client ID and Secret into `.env`

### Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

## Deploy (single machine)

```bash
# On your AWS instance:
git clone <repo> && cd word-research/app
cp .env.example .env
# Fill in .env
npm install
npm run build
npm start  # runs on port 3000

# Set up scoring cron (runs at midnight UTC):
crontab -e
# 0 0 * * * cd /path/to/app && npx tsx scripts/score.ts >> /var/log/word-score.log 2>&1
```

Put nginx or caddy in front for HTTPS.

## Scoring

Words only count if:
- 10+ unique users have submitted them
- They're NOT in a standard English dictionary

Points are awarded by submission order: 1st = 1.0 pts, 2nd = 0.9, ..., 10th = 0.1. Scores recalculate nightly.

## Data

All submission data is open source and MIT licensed for linguistics research. The SQLite database lives at `data/word-research.db`.
