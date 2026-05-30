# 🔒 Guia de Segurança - Compara Aqui

## Status Atual

| Aspecto | Status | Descrição |
|---------|--------|-----------|
| Input Validation | ✅ Implementado | Valida tamanho do termo (min 2 caracteres) |
| SQL Injection | ✅ Protegido | Prisma ORM sanitiza automaticamente |
| Rate Limiting | ⏳ TODO | Implementar em Phase 4 |
| HTTPS | ✅ Vercel Auto | Certificados Let's Encrypt automáticos |
| Bot Detection Evasion | ⚠️ Básico | Tem proteção mas ML pode bloquear |
| Dados Sensíveis | ✅ Seguro | Nenhuma credencial hardcoded |
| CORS | ⏳ TODO | Implementar whitelist de origens |

---

## ⚠️ Vulnerabilidades Conhecidas & Soluções

### 1. **Mercado Livre Challenge (Proteção Anti-Bot)**

**Problema:**
```
[API] Erro Mercado Livre: browserType.launch: Timeout após 25000ms
[ML] Challenge detectado na página 1 - aguardando...
```

**Causa:** ML detecta padrões de automação

**Soluções (Ordem de Prioridade):**

1. **Usar API Oficial** (Melhor)
   ```bash
   # Registrar em: https://developers.mercadolivre.com.br/
   # Documentação: https://api.mercadolivre.com/docs
   
   # Exemplo de integração:
   curl -X GET "https://api.mercadolivre.com/sites/MLB/search?q=iphone"
   ```
   - ✅ Legal e permitido
   - ✅ Confiável
   - ❌ Rate limit é baixo (2000 req/dia)
   - ❌ Requer aprovação

2. **Implementar Proxy Rotation** (Intermediário)
   ```bash
   # Use serviço como: Oxylabs, Brightdata, Scrapy Cloud
   
   npm install --save proxy-agent
   
   # Adicione ao scraper
   const agent = new HttpProxyAgent('http://proxy:port');
   await page.goto(url, { agent });
   ```
   - ✅ Mais difícil de detectar
   - ⚠️ Caro ($50+/mês)
   - ⚠️ Legalmente questionável

3. **Melhorar Anti-Detection** (Atual - Inadequado)
   ```typescript
   // Já implementado em scraper.ts:
   // - User Agent realista
   // - Delays aleatórios
   // - Remover navigator.webdriver
   // - Bloquear tracking requests
   
   // TODO: Adicionar
   // - Headless detection evasion
   // - CDP protocol override
   // - Geolocation spoofing
   ```
   - ✅ Gratuito
   - ❌ Risco de bloqueio
   - ❌ Requer manutenção frequente (ML muda proteção)

4. **Fallback Inteligente** (Recomendado para MVP)
   ```typescript
   async function buscarMercadoLivre(termo: string) {
     try {
       // Tenta scraper
       return await scraperML(termo);
     } catch (error) {
       // Fallback: retorna cache antigo (24h)
       const cache24h = await buscarCacheAntigo(termo, 24);
       if (cache24h) return cache24h;
       
       // Ou sugere API oficial
       console.warn('[ML] Considere usar API oficial');
       return [];
     }
   }
   ```
   - ✅ Mantém funcionalidade mesmo bloqueado
   - ✅ Não quebra UX
   - ❌ Dados podem ser antigos

### **Recomendação Imediata:**
Use API oficial do ML quando possível, fallback para cache de 24h se scraper falhar.

---

### 2. **Rate Limiting (Não Implementado)**

**Risco:** Alguém faz 1000 requisições/hora → esgota quota do scraper

**Solução:**

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetAt: number }>();

export async function middleware(request: NextRequest) {
  // Pega IP real (pode estar atrás de proxy)
  const ip = 
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const now = Date.now();
  const window = 60 * 1000; // 1 minuto
  const limit = 10; // 10 requests por minuto

  let record = rateLimit.get(ip);
  
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + window };
    rateLimit.set(ip, record);
  }

  record.count++;

  if (record.count > limit) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (record.resetAt / 1000).toString(),
      }}
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', (limit - record.count).toString());
  response.headers.set('X-RateLimit-Reset', (record.resetAt / 1000).toString());
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

**TODO para Phase 4:** Implementar com Redis para distribuição

---

### 3. **Data Exposure (ToS Violations)**

**Risco:** Amazon/ML descobrem scraping → banimento

**Proteção Existente:**
- ✅ Delays entre requests (1-4s)
- ✅ User-Agent realista
- ✅ Cache de 2h (reduz requisições)

**Proteção TODO:**
- ❌ Respeitar robots.txt
- ❌ User-Agent para identificação (vê-se como search engine)
- ❌ Ter `Contact` header com email

**Implementar:**

```typescript
// src/lib/robots-parser.ts
import { createUserAgent } from 'browsersync';

async function verificarRobotsTxt(dominio: string) {
  const response = await fetch(`https://${dominio}/robots.txt`);
  const texto = await response.text();
  
  // Parse robots.txt e verifica se scraping é permitido
  const regras = parseRobots(texto);
  
  if (regras.isAllowed('/')) {
    return true;
  } else {
    console.warn(`[Security] Scraping de ${dominio} pode violar ToS`);
    return false;
  }
}

// Verificar antes de scraper
if (!await verificarRobotsTxt('mercadolivre.com.br')) {
  console.warn('[Security] Considere usar API oficial');
}
```

---

### 4. **XSS (Cross-Site Scripting)**

**Risco:** Se exibir URLs/descrições sem sanitizar

**Status:** ✅ Protegido (React escapa HTML por padrão)

**Verificação:**
```typescript
// Isso é SEGURO em React:
<a href={produto.urlProduto}>
  {produto.titulo} {/* Automáticamente escapado */}
</a>

// Isso é PERIGOSO:
<div dangerouslySetInnerHTML={{ __html: produto.titulo }} />
```

**Manter seguro:**
- ❌ Nunca use `dangerouslySetInnerHTML` com dados de scraper
- ✅ Sempre use binding normal do React
- ✅ Validar URLs antes de exibir

---

### 5. **SSRF (Server-Side Request Forgery)**

**Risco:** Se aceitar URL do usuário para scraper

**Status:** ✅ Seguro (não aceitamos URLs do usuário)

**Se implementar no futuro:**
```typescript
function validarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Whitelist de dominios permitidos
    const permitidos = ['amazon.com.br', 'mercadolivre.com.br'];
    
    return permitidos.some(d => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

if (!validarUrl(userUrl)) {
  throw new Error('URL não permitida');
}
```

---

## 🔐 Checklist de Segurança para Deploy

- [ ] **Variáveis Sensíveis**
  - [ ] DATABASE_URL não em .env público
  - [ ] API keys em Vercel Secrets
  - [ ] Nenhuma senha em comentários de código

- [ ] **HTTPS**
  - [ ] Vercel: ✅ Automático
  - [ ] VPS: Configurar Let's Encrypt

- [ ] **Rate Limiting**
  - [ ] Implementado em middleware
  - [ ] Testado com load test

- [ ] **Input Validation**
  - [ ] Termo: 2-100 caracteres
  - [ ] Preço: número positivo
  - [ ] URLs: whitelist de dominios

- [ ] **Database**
  - [ ] Backups diários
  - [ ] Prisma queries parametrizadas (✅ automático)
  - [ ] Conexão criptografada (PostgreSQL)

- [ ] **Logs & Monitoring**
  - [ ] Erros enviados para Sentry
  - [ ] Logs não contêm senhas
  - [ ] Monitorar timeouts do scraper

- [ ] **ToS Compliance**
  - [ ] Respeitar robots.txt
  - [ ] Delays adequados entre requisições
  - [ ] Cache para reduzir hits

- [ ] **Testes**
  - [ ] Testar SQL injection
  - [ ] Testar XSS com URLs maliciosas
  - [ ] Testar rate limiting

---

## 📋 Melhorias Recomendadas (Prioridade)

### Alta Prioridade
1. Implementar rate limiting (Phase 4)
2. Usar API oficial do ML (investigação)
3. Respeitar robots.txt
4. Adicionar logging de erros (Sentry)

### Média Prioridade
1. CORS whitelist
2. Helmet.js headers de segurança
3. Validação de URL mais rigorosa
4. Backups automatizados

### Baixa Prioridade
1. WAF (Web Application Firewall)
2. DDoS protection
3. Penetration testing
4. Security audit completo

---

## 🚨 Incidentes Conhecidos & Respostas

### Cenário 1: ML está bloqueando scraper
**Sinais:** Timeouts consistentes, captchas
**Ação:**
1. Aumentar delay (5-10s entre requests)
2. Usar proxy rotation
3. Fallback para API oficial
4. Alertar usuários

### Cenário 2: Taxa de erro >10% por 1h
**Sinais:** Logs cheios de erros
**Ação:**
1. Verificar status da Amazon/ML
2. Verificar conexão de internet
3. Restartar containers se em production
4. Alertar no Slack/Discord

### Cenário 3: Alguém faz 1000 req/min
**Sinais:** Rate limit headers violados
**Ação:**
1. IP é bloqueado automaticamente (rate limit)
2. Log registrado para análise
3. Se VPS própria: considerar banir IP permanentemente

---

## Contato de Segurança

Para reportar vulnerabilidades:
1. **NÃO** abra issue pública
2. Email: security@compara-aqui.com (criar)
3. Ou contacte direto no Discord/Slack

Obrigado pela ajuda em manter o projeto seguro! 🙏
