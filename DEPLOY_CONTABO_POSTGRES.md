# L'Échoppe VPS Deployment — PostgreSQL, no Supabase

This version has been adjusted to run with local PostgreSQL on a Contabo VPS.

## 1) SSH into the VPS

On your local machine:

```bash
chmod 600 /path/to/your-key.pem
ssh -i /path/to/your-key.pem root@173.249.11.197
```

Do not commit or upload your PEM key into the project folder.

## 2) Install Docker on Ubuntu/Debian VPS

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```

If your VPS is not Ubuntu, use the official Docker install command for your OS.

## 3) Upload this project

From your local machine:

```bash
scp -i /path/to/your-key.pem lechoppe-postgresql-vps.zip root@173.249.11.197:/root/
```

On the VPS:

```bash
cd /root
unzip lechoppe-postgresql-vps.zip
cd lechoppe-postgresql-vps
cp .env.example .env
nano .env
```

Change these values in `.env`:

```env
POSTGRES_DB=lechoppe
POSTGRES_USER=lechoppe_user
POSTGRES_PASSWORD=USE_A_STRONG_PASSWORD_HERE
ADMIN_PASSPHRASE=USE_A_STRONG_ADMIN_PASSWORD_HERE
```

## 4) Build and run

```bash
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f lechoppe
```

Open:

```text
http://173.249.11.197:3000
http://173.249.11.197:3000/admin/login
```

## 5) Optional: Nginx reverse proxy for domain

Install Nginx:

```bash
apt install -y nginx
```

Create config:

```bash
nano /etc/nginx/sites-available/lechoppe
```

Paste and replace `yourdomain.com`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

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

Enable it:

```bash
ln -s /etc/nginx/sites-available/lechoppe /etc/nginx/sites-enabled/lechoppe
nginx -t
systemctl reload nginx
```

Add SSL:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 6) Useful commands

Restart app:

```bash
docker compose restart lechoppe
```

Open database shell:

```bash
docker compose exec postgres psql -U lechoppe_user -d lechoppe
```

Backup database:

```bash
docker compose exec postgres pg_dump -U lechoppe_user lechoppe > lechoppe_backup.sql
```

Update after changing code:

```bash
docker compose up -d --build
```

## Notes

- Supabase client usage has been replaced with a small local PostgreSQL API adapter.
- Images are stored inside the Docker volume `uploads_data` and served from `/uploads/...`.
- The PostgreSQL data is stored in the Docker volume `postgres_data`.
- The first database seed is inside `db/init/001_init.sql`.
