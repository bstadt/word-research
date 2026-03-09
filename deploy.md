# Word Research — Deployment Guide

## Production Server

- **Host**: `3.143.141.90`
- **User**: `ubuntu`
- **SSH Key**: `~/.ssh/calco_key.pem`
- **SSH Command**: `ssh -i ~/.ssh/calco_key.pem ubuntu@3.143.141.90`
- **App Directory**: `/home/ubuntu/word-research/app`
- **Branch**: `v1`
- **Database**: `/home/ubuntu/word-research/app/data/word-research.db`

## Prerequisites

- Ubuntu/Debian AWS instance (t3.small is fine to start)
- DNS A record pointing your domain at the instance IP
- Google OAuth authorized JavaScript origin added for `https://your-domain.com`

## 1. Server Setup

```bash
# Install Node.js 20 and nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx

# Clone and install
git clone https://github.com/bstadt/word-research.git ~/word-research
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
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-client-id>
AUTH_URL=https://your-domain.com
```

```bash
# Build
npm run build
```

## 2. nginx Config

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
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 3. HTTPS with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 4. systemd Service

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
sudo systemctl enable word-research
sudo systemctl start word-research
sudo systemctl status word-research
```

## 5. Scoring Cron

```bash
crontab -e
```

Add:
```
0 0 * * * cd /home/ubuntu/word-research/app && /usr/bin/npx tsx scripts/score.ts >> /var/log/word-score.log 2>&1
```

## 6. Verify

- Visit https://your-domain.com — should see landing page
- Sign in with Google
- Submit a word
- Check `data/word-research.db` exists

## Updating

```bash
ssh -i ~/.ssh/calco_key.pem ubuntu@3.143.141.90
cd ~/word-research
git fetch origin
git checkout <branch>  # e.g. v1
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
