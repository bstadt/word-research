# Word Research — Deployment Guide

## Prerequisites

- Ubuntu/Debian AWS instance (t3.small is fine to start)
- Node.js 20+ installed
- nginx installed
- A domain pointed at the instance IP
- Google OAuth credentials (see below)

## 1. Google OAuth Setup

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new project (or use existing)
3. Configure OAuth consent screen (External, add your domain)
4. Create OAuth 2.0 Client ID → Web application
5. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
6. Note the Client ID and Client Secret

## 2. Server Setup

```bash
# Install Node.js 20 if not present
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install
git clone <repo-url> ~/word-research
cd ~/word-research/app
npm install

# Configure environment
cp .env.example .env
nano .env
```

Fill in `.env`:
```
AUTH_GOOGLE_ID=<your-client-id>
AUTH_GOOGLE_SECRET=<your-client-secret>
AUTH_SECRET=<run: openssl rand -base64 32>
AUTH_URL=https://your-domain.com
```

## 3. nginx Config

```bash
sudo nano /etc/nginx/sites-available/word-research
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/word-research /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 4. HTTPS with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 5. Run as systemd Service

```bash
sudo nano /etc/systemd/system/word-research.service
```

```ini
[Unit]
Description=Word Research
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/word-research/app
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Build first
cd ~/word-research/app
bash scripts/start.sh  # initial build

# Then enable the service (it just runs npm start, build is already done)
sudo systemctl enable word-research
sudo systemctl start word-research
sudo systemctl status word-research
```

## 6. Scoring Cron

```bash
crontab -e
```

Add:
```
0 0 * * * cd /home/ubuntu/word-research/app && /usr/bin/npx tsx scripts/score.ts >> /var/log/word-score.log 2>&1
```

## 7. Verify

- Visit https://your-domain.com — should see landing page
- Sign in with Google
- Submit a word
- Check `data/word-research.db` exists

## Updating

```bash
cd ~/word-research
git pull
cd app
npm install
npm run build
sudo systemctl restart word-research
```

## Backup / Migrate to Bigger Machine

```bash
# Snapshot the database
cp app/data/word-research.db ~/word-research-backup.db

# On new machine: set up everything above, then copy the db in
scp old-machine:~/word-research-backup.db ~/word-research/app/data/word-research.db
sudo systemctl restart word-research
```
