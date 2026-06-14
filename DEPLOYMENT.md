# 🚀 Guia de Deployment - Compara Aqui

## Opções de Deployment

### 1. **Desenvolvimento Local**

```bash
# Setup
npm install
DATABASE_URL="file:./dev.db" npx prisma db push
npm run dev
```

- Acessa em `http://localhost:3000`
- Usa SQLite para persistência local
- Cache de 2 horas em memória
- Ideal para desenvolvimento e testes

---

### 2. **Docker Compose (Staging)**

```bash
# Build e inicia
docker-compose up --build

# Acessa em http://localhost:3000

# Para (mantém volumes)
docker-compose down

# Limpa tudo (incluindo BD)
docker-compose down -v
```

**Características:**
- Ambiente containerizado completo
- Volume para persistência de dados (`./data`)
- Hot-reload com volume mounts
- Pronto para staging/testing

---

### 3. **Docker Standalone (VPS/Cloud)**

```bash
# Build
docker build -t compara-aqui:latest .

# Executa
docker run -d \
  --name compara-aqui \
  -p 3000:3000 \
  -e DATABASE_URL="file:./data/prod.db" \
  -e NODE_ENV=production \
  -v compara-aqui-data:/app/data \
  compara-aqui:latest

# Logs
docker logs -f compara-aqui

# Stop
docker stop compara-aqui
```

**Deployment em VPS:**
1. SSH into VPS (Ubuntu 22.04)
2. Instale Docker: `curl -fsSL https://get.docker.com | sh`
3. Clone repo: `git clone <repo>`
4. Execute: `docker run -d --name compara-aqui ...` (veja acima)
5. Configure Nginx como proxy reverso (veja abaixo)

---

### 4. **Vercel (Production)**

```bash
# Push para main branch (auto-deploy)
git push origin main

# Variáveis de ambiente (Vercel Dashboard):
DATABASE_URL=postgresql://...  # Managed PostgreSQL
NODE_ENV=production
```

**Checklist Vercel:**
- ✅ Database URL apontando para PostgreSQL managed
- ✅ `.env.production` não no repo
- ✅ Prisma migrations rodadas antes do deploy
- ✅ Build script: `next build`
- ✅ Start script: `next start`

---

## Configuração de Segurança

### 1. **Variáveis de Ambiente**

**Obrigatório:**
```bash
DATABASE_URL=file:./dev.db          # Local
DATABASE_URL=postgresql://user:pass@host/db  # Production

NODE_ENV=development|production
```

**Opcional (futuro):**
```bash
REDIS_URL=redis://...               # Cache distribuído
API_KEY_MERCADO_LIVRE=...           # Affiliate links
NEXT_PUBLIC_ANALYTICS_ID=...        # Analytics
```

**Nunca commit:**
- `.env.local`
- `.env.production.local`
- Qualquer chave privada
- Credenciais de banco de dados

---

### 2. **Rate Limiting** (Phase 4)

```bash
# Headers de segurança
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1234567890
```

Implementar:
```typescript
// middleware.ts
const rateLimit = new RateLimiter({
  points: 10,           // 10 requests
  duration: 60,         // per 60 seconds
  blockDuration: 60,    // block for 60s if exceeded
});
```

---

### 3. **HTTPS & SSL**

**Vercel:** Automático com certificados Let's Encrypt

**Nginx (VPS):**
```nginx
server {
  listen 443 ssl http2;
  server_name compara-aqui.com;

  ssl_certificate /etc/letsencrypt/live/compara-aqui.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/compara-aqui.com/privkey.pem;
  
  # Redireciona HTTP → HTTPS
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Instale SSL:
```bash
sudo apt update && sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d compara-aqui.com
```

---

### 4. **CORS & CSRF**

```typescript
// Bloqueia requests de origens não autorizadas
const ALLOWED_ORIGINS = [
  'https://compara-aqui.com',
  'https://www.compara-aqui.com',
];

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: 'CORS blocked' }, { status: 403 });
  }
  
  return NextResponse.next();
}
```

---

### 5. **Input Validation**

✅ Feito:
- Termo de busca: mínimo 2 caracteres
- Filtro de preços válidos

❌ TODO:
- Sanitizar inputs para SQL injection (Prisma já protege)
- Validar URLs (whitelisting de dominios)
- Rate limit por IP

---

## Performance & Monitoramento

### Métricas Importantes

1. **Tempo de Resposta da API**
   - Target: <3s com cache
   - Target: <5s sem cache
   - Alertar se > 10s

2. **Cache Hit Rate**
   - Target: 70%+ em horário de pico
   - Monitore via logs

3. **Erro Rate**
   - Target: <1%
   - Rastrear timeouts do scraper

4. **Database**
   - SQLite: Tamanho máx ~1GB (recomendado PostgreSQL para production)
   - Backups: Daily

---

## CI/CD Pipeline

### GitHub Actions (Sugerido)

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run build
      - run: npm run test  # TODO: Add tests
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: vercel --prod
```

---

## Troubleshooting

### "Executable doesn't exist" (Playwright)

```bash
# Fix
npx playwright install

# Com dependências do SO
npx playwright install --with-deps
```

### "DATABASE_URL not found"

```bash
# Verifica env var
echo $DATABASE_URL

# Set it
export DATABASE_URL="file:./dev.db"

# Ou use no comando
DATABASE_URL="..." npm run dev
```

### Timeout na busca ML

O Mercado Livre tem proteção contra bots. Soluções:

1. Aumentar delay entre requests (já feito)
2. Usar proxies (não implementado)
3. Usar API oficial do ML (Partner Program)
4. Implementar fallback (cache de 24h)

---

## Roadmap Deployment

**Fase Atual (MVP):**
- ✅ Development local (SQLite)
- ✅ Docker Compose para staging
- ⏳ Vercel para production

**Próximas Fases:**
1. Redis para cache distribuído
2. PostgreSQL managed (Vercel Postgres ou RDS)
3. CI/CD com GitHub Actions
4. Monitoring com Sentry
5. CDN para imagens (Cloudinary)
6. Background jobs (Bull/BullMQ)

---

## Contato & Suporte

Para issues de deployment, abra uma issue no GitHub ou contacte o time.
