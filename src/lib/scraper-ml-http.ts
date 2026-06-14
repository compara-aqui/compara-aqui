import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import * as crypto from "crypto";
import { ProdutoScrapado } from "./scraper";

// ============================================================
// Scraper Mercado Livre via HTTP direto (sem Playwright)
// Resolve o challenge PoW (Proof-of-Work) do anti-bot do ML
// ============================================================

// Pool de User-Agents realistas e atualizados
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

function obterUserAgentAleatorio(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Pausa aleatória para simular comportamento humano
 */
function esperar(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.random() * (maxMs - minMs) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * SHA-256 hash (sync, using Node.js crypto — much faster than WebCrypto)
 */
function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Resolve o challenge PoW do Mercado Livre
 * O ML usa hashcash: encontrar `r` tal que SHA256(nonce + r) comece com `difficulty` zeros
 */
function resolverChallenge(
  nonce: string,
  difficulty: number
): { solution: number; hash: string } {
  if (difficulty === 0) {
    return { solution: 0, hash: sha256(nonce + "0") };
  }

  const prefix = "0".repeat(difficulty);
  const maxIterations = 10_000_000; // Safety limit

  for (let i = 0; i < maxIterations; i++) {
    const hash = sha256(nonce + i);
    if (hash.startsWith(prefix)) {
      return { solution: i, hash };
    }
  }

  // Fallback if not found (shouldn't happen with reasonable difficulty)
  return { solution: 0, hash: "" };
}

/**
 * Extrai nonce e difficulty do cookie _bmstate
 */
function parseBmState(cookies: string[]): {
  nonce: string;
  difficulty: number;
} | null {
  for (const cookie of cookies) {
    const match = cookie.match(/_bmstate=([^;]+)/);
    if (match) {
      const decoded = decodeURIComponent(match[1]);
      const parts = decoded.split(";");
      if (parts.length >= 2) {
        return {
          nonce: parts[0],
          difficulty: parseInt(parts[1]) || 0,
        };
      }
    }
  }
  return null;
}

/**
 * Extrai o domínio de topo para cookies (ex: mercadolivre.com.br)
 */
function getTopLevelDomain(hostname: string): string {
  const meliDomains = [
    "mercadoli",
    "mercadopago",
    "mercadocredito",
    "mercadosocios",
  ];
  for (const d of meliDomains) {
    const idx = hostname.indexOf(d);
    if (idx !== -1) return hostname.substring(idx);
  }
  return hostname;
}

/**
 * Cria instância axios com headers realistas para ML
 */
function criarClienteHttp(userAgent: string): AxiosInstance {
  const isFirefox = userAgent.includes("Firefox");

  return axios.create({
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      "User-Agent": userAgent,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      ...(isFirefox
        ? { "Sec-GPC": "1" }
        : { "sec-ch-ua-platform": '"Windows"' }),
      "Cache-Control": "max-age=0",
    },
    withCredentials: false,
  });
}

/**
 * Monta a URL de busca do Mercado Livre
 */
function montarUrlBusca(termo: string, pagina: number): string {
  const termoFormatado = termo.replace(/\s+/g, "-");
  if (pagina === 1) {
    return `https://lista.mercadolivre.com.br/${encodeURIComponent(termoFormatado)}`;
  }
  const offset = (pagina - 1) * 50 + 1;
  return `https://lista.mercadolivre.com.br/${encodeURIComponent(termoFormatado)}_Desde_${offset}_NoIndex_True`;
}

/**
 * Faz request inicial, resolve challenge PoW, e refaz request com cookies de bypass
 */
async function fetchComChallenge(
  cliente: AxiosInstance,
  url: string,
  referer: string
): Promise<string> {
  // 1. Request inicial — deve retornar challenge page + _bmstate cookie
  console.log("[ML-HTTP] Request inicial...");
  const response1 = await cliente.get(url, {
    headers: { Referer: referer },
    // Não seguir redirects automaticamente para capturar cookies
    maxRedirects: 0,
    validateStatus: (status) => status < 400,
  });

  const setCookies: string[] = [];
  const rawSetCookie = response1.headers["set-cookie"];
  if (rawSetCookie) {
    if (Array.isArray(rawSetCookie)) {
      setCookies.push(...rawSetCookie);
    } else {
      setCookies.push(rawSetCookie as string);
    }
  }

  const html1 = response1.data as string;

  // Verifica se é uma página de challenge
  const isChallenge =
    html1.length < 15000 &&
    (html1.includes("_bmstate") ||
      html1.includes("verifyChallenge") ||
      html1.includes("_bm_skipml") ||
      html1.includes("continue-button"));

  if (!isChallenge) {
    // Sem challenge — retorna HTML diretamente
    console.log("[ML-HTTP] Sem challenge detectado, HTML direto recebido");
    return html1;
  }

  console.log("[ML-HTTP] Challenge PoW detectado, resolvendo...");

  // 2. Extrair nonce e difficulty do cookie _bmstate
  const bmState = parseBmState(setCookies);

  // Fallback: tentar extrair do HTML se não veio no cookie
  let nonce: string;
  let difficulty: number;

  if (bmState) {
    nonce = bmState.nonce;
    difficulty = bmState.difficulty;
  } else {
    // Tenta extrair do JavaScript inline
    const nonceMatch = html1.match(/_bmstate=([^"&;]+)/);
    if (nonceMatch) {
      const decoded = decodeURIComponent(nonceMatch[1]);
      const parts = decoded.split(";");
      nonce = parts[0];
      difficulty = parseInt(parts[1]) || 0;
    } else {
      console.log(
        "[ML-HTTP] ⚠️  Não encontrou _bmstate — tentando bypass direto"
      );
      nonce = "0";
      difficulty = 0;
    }
  }

  console.log(
    `[ML-HTTP] Challenge: nonce="${nonce.substring(0, 20)}...", difficulty=${difficulty}`
  );

  // 3. Resolver o PoW
  const inicio = Date.now();
  const { solution } = resolverChallenge(nonce, difficulty);
  const tempoMs = Date.now() - inicio;
  console.log(`[ML-HTTP] ✓ Challenge resolvido em ${tempoMs}ms (r=${solution})`);

  // 4. Montar cookies de solução
  const domain = getTopLevelDomain("lista.mercadolivre.com.br");
  const bmcValue = encodeURIComponent(`${nonce};${solution}`);
  const bypassExpiry = new Date(Date.now() + 300000).toUTCString(); // 5 minutos

  // Concatenar todos os cookies originais + os novos
  const allOriginalCookies = setCookies
    .map((c) => c.split(";")[0]) // Pega apenas nome=valor
    .join("; ");

  const solutionCookies = [
    allOriginalCookies,
    `_bmc=${bmcValue}`,
    `_bm_skipml=true`,
  ]
    .filter(Boolean)
    .join("; ");

  console.log("[ML-HTTP] Refazendo request com cookies de bypass...");

  // 5. Aguarda um pouco para simular processamento
  await esperar(200, 500);

  // 6. Request com cookies de solução
  const response2 = await cliente.get(url, {
    headers: {
      Referer: referer,
      Cookie: solutionCookies,
    },
  });

  const html2 = response2.data as string;
  console.log(`[ML-HTTP] Resposta pós-challenge: ${html2.length} bytes`);

  // Capturar novos cookies se houver
  const newCookies = response2.headers["set-cookie"];
  if (newCookies) {
    const newCookieStr = (Array.isArray(newCookies) ? newCookies : [newCookies])
      .map((c: string) => c.split(";")[0])
      .join("; ");

    // Se ainda temos challenge, tentar uma terceira vez com todos os cookies
    if (html2.length < 15000 && html2.includes("continue-button")) {
      console.log("[ML-HTTP] Segundo challenge detectado, tentando novamente...");
      await esperar(300, 700);

      const allCookies = [solutionCookies, newCookieStr]
        .filter(Boolean)
        .join("; ");

      const response3 = await cliente.get(url, {
        headers: {
          Referer: referer,
          Cookie: allCookies,
        },
      });

      const html3 = response3.data as string;
      console.log(`[ML-HTTP] Terceira tentativa: ${html3.length} bytes`);
      return html3;
    }
  }

  return html2;
}

/**
 * Extrai produtos do HTML do Mercado Livre usando cheerio
 */
function extrairProdutosDoHtml(html: string): ProdutoScrapado[] {
  const $ = cheerio.load(html);
  const produtos: ProdutoScrapado[] = [];

  // Seletores primários para resultados de busca do ML
  const seletoresPrincipais = [
    ".ui-search-layout__item",
    ".ui-search-result__wrapper",
    "li.ui-search-layout__item",
    ".poly-card",
  ];

  let $items: ReturnType<typeof $> | null = null;

  for (const seletor of seletoresPrincipais) {
    const candidatos = $(seletor);
    if (candidatos.length > 0) {
      $items = candidatos;
      console.log(
        `[ML-HTTP] Seletor "${seletor}" encontrou ${candidatos.length} itens`
      );
      break;
    }
  }

  if (!$items || $items.length === 0) {
    // Debug
    const htmlLower = html.toLowerCase();
    if (htmlLower.includes("captcha") || htmlLower.includes("challenge")) {
      console.log("[ML-HTTP] ⚠️  Challenge/CAPTCHA ainda presente no HTML");
    } else if (html.length < 5000) {
      console.log(
        `[ML-HTTP] ⚠️  HTML muito pequeno (${html.length} bytes) — possível bloqueio`
      );
    } else {
      // Try to find any useful classes
      const classes = new Set<string>();
      $("[class]").each((_, el) => {
        const cls = $(el).attr("class") || "";
        cls.split(/\s+/).forEach((c) => {
          if (
            c.includes("search") ||
            c.includes("poly") ||
            c.includes("item") ||
            c.includes("card")
          ) {
            classes.add(c);
          }
        });
      });
      if (classes.size > 0) {
        console.log(
          `[ML-HTTP] Classes relevantes encontradas: ${Array.from(classes).slice(0, 15).join(", ")}`
        );
      } else {
        console.log(
          `[ML-HTTP] ⚠️  Nenhum seletor de produto encontrado (HTML: ${html.length} bytes)`
        );
      }
    }
    return [];
  }

  $items.each((_index, element) => {
    try {
      const $item = $(element);

      // === TÍTULO ===
      const titulo =
        $item.find(".ui-search-item__title").text().trim() ||
        $item
          .find(
            ".poly-component__title a, .poly-card__portada a, a.poly-component__title"
          )
          .text()
          .trim() ||
        $item.find("h2").text().trim() ||
        $item.find("h3").text().trim();

      if (!titulo || titulo.length < 3) return;

      // === PREÇO ===
      let preco: number | null = null;

      // Tenta pegar o preço do container principal (não o riscado)
      const $precoContainer =
        $item
          .find(
            ".andes-money-amount--cents-superscript:not(.andes-money-amount--previous)"
          )
          .first() ||
        $item
          .find(".ui-search-price__second-line .andes-money-amount")
          .first();

      if ($precoContainer.length > 0) {
        const inteiro = $precoContainer
          .find(".andes-money-amount__fraction")
          .first()
          .text()
          .replace(/\./g, "")
          .trim();
        const centavos =
          $precoContainer
            .find(".andes-money-amount__cents")
            .first()
            .text()
            .trim() || "00";

        if (inteiro) {
          preco = parseFloat(`${inteiro}.${centavos}`);
          if (isNaN(preco)) preco = null;
        }
      }

      // Fallback: pegar qualquer fração
      if (!preco) {
        const $fracoes = $item.find(".andes-money-amount__fraction");
        if ($fracoes.length > 0) {
          const textoPreco = $fracoes.last().text().replace(/\./g, "").trim();
          preco = textoPreco ? parseFloat(textoPreco) : null;
          if (isNaN(preco!)) preco = null;
        }
      }

      if (!preco || preco <= 0) return;

      // === PREÇO ORIGINAL (riscado) ===
      let precoOriginal: number | null = null;
      const $precoRiscado = $item.find(
        ".andes-money-amount--previous .andes-money-amount__fraction"
      );
      if ($precoRiscado.length > 0) {
        const texto = $precoRiscado.first().text().replace(/\./g, "").trim();
        precoOriginal = texto ? parseFloat(texto) : null;
        if (isNaN(precoOriginal!)) precoOriginal = null;
      }

      // === DESCONTO ===
      let descontoPercentual: number | null = null;
      const textoDesconto = $item
        .find(
          ".ui-search-price__discount, .andes-money-amount__discount, .poly-component__discount"
        )
        .first()
        .text();
      if (textoDesconto) {
        const numeros = textoDesconto.replace(/[^0-9]/g, "");
        descontoPercentual = numeros ? parseInt(numeros) : null;
      } else if (preco && precoOriginal && precoOriginal > preco) {
        descontoPercentual = Math.round((1 - preco / precoOriginal) * 100);
      }

      // === AVALIAÇÃO ===
      let avaliacao: number | null = null;
      const textoAvaliacao = $item
        .find(
          ".ui-search-reviews__rating-number, .poly-reviews__rating, [class*='reviews__rating']"
        )
        .first()
        .text()
        .replace(",", ".");
      if (textoAvaliacao) {
        avaliacao = parseFloat(textoAvaliacao);
        if (isNaN(avaliacao)) avaliacao = null;
      }

      // === NÚMERO DE AVALIAÇÕES ===
      let numAvaliacoes: number | null = null;
      const textoNumAval = $item
        .find(
          ".ui-search-reviews__amount, .poly-reviews__total, [class*='reviews__amount']"
        )
        .first()
        .text()
        .replace(/[^0-9]/g, "");
      if (textoNumAval) {
        numAvaliacoes = parseInt(textoNumAval);
        if (isNaN(numAvaliacoes)) numAvaliacoes = null;
      }

      // === IMAGEM ===
      const $img = $item.find(
        "img.ui-search-result-image__element, img.poly-component__picture, img[class*='search-result-image']"
      );
      const imagemUrl =
        $img.attr("data-src") ||
        $img.attr("src") ||
        $item.find("img").first().attr("data-src") ||
        $item.find("img").first().attr("src") ||
        "";

      // === LINK ===
      let urlProduto =
        $item.find("a.ui-search-link").attr("href") ||
        $item.find("a.ui-search-item__group__element").attr("href") ||
        $item
          .find("a.poly-component__title, a[class*='search-link']")
          .attr("href") ||
        $item.find("a").first().attr("href") ||
        "";

      if (!urlProduto || !urlProduto.includes("mercadoli")) return;
      // Remove tracking params
      urlProduto = urlProduto.split("#")[0].split("?")[0];

      // === FRETE GRÁTIS ===
      const textoItem = ($item.text() || "").toLowerCase();
      const freteGratis =
        textoItem.includes("grátis") || textoItem.includes("gratis");

      produtos.push({
        titulo: titulo.substring(0, 300),
        preco,
        precoOriginal,
        descontoPercentual,
        avaliacao,
        numAvaliacoes,
        freteGratis,
        isPrime: false,
        imagemUrl,
        urlProduto,
        loja: "mercadolivre",
      });
    } catch {
      // Ignora item com erro de parsing
    }
  });

  return produtos;
}

/**
 * Busca produtos do Mercado Livre via HTTP direto
 * Resolve automaticamente o challenge PoW anti-bot
 *
 * @param termo - Termo de busca
 * @param numPaginas - Número de páginas para buscar (default: 1)
 * @returns Array de ProdutoScrapado
 */
export async function buscarMercadoLivreHttp(
  termo: string,
  numPaginas: number = 1
): Promise<ProdutoScrapado[]> {
  console.log(
    `[ML-HTTP] Buscando: "${termo}" em ${numPaginas} página(s) via HTTP`
  );

  const produtos: ProdutoScrapado[] = [];
  const userAgent = obterUserAgentAleatorio();
  const cliente = criarClienteHttp(userAgent);

  for (let pagina = 1; pagina <= numPaginas; pagina++) {
    let tentativas = 0;
    const maxTentativas = 3;
    let sucesso = false;

    while (tentativas < maxTentativas && !sucesso) {
      tentativas++;

      try {
        const url = montarUrlBusca(termo, pagina);
        const referer =
          pagina === 1
            ? "https://www.mercadolivre.com.br/"
            : montarUrlBusca(termo, pagina - 1);

        console.log(
          `[ML-HTTP] Página ${pagina}/${numPaginas} (tentativa ${tentativas})...`
        );

        // Delay humanizado (exceto primeira tentativa da primeira página)
        if (pagina > 1 || tentativas > 1) {
          await esperar(1500, 3500);
        }

        const html = await fetchComChallenge(cliente, url, referer);

        console.log(
          `[ML-HTTP] HTML recebido: ${html.length} bytes`
        );

        // Se HTML ainda é muito pequeno, provavelmente bloqueado
        if (html.length < 10000) {
          console.log(
            `[ML-HTTP] ⚠️  HTML pequeno (${html.length} bytes) — possível bloqueio persistente`
          );
          if (tentativas < maxTentativas) {
            const delay = 2000 * Math.pow(2, tentativas - 1);
            console.log(`[ML-HTTP] Aguardando ${delay}ms antes de retry...`);
            await esperar(delay, delay + 1000);
            continue;
          }
        }

        const produtosDaPagina = extrairProdutosDoHtml(html);
        produtos.push(...produtosDaPagina);
        console.log(
          `[ML-HTTP] ✓ Página ${pagina}: ${produtosDaPagina.length} produtos extraídos`
        );

        sucesso = true;
      } catch (err: any) {
        console.error(
          `[ML-HTTP] ✗ Erro na página ${pagina} (tentativa ${tentativas}):`,
          err.message
        );

        if (tentativas < maxTentativas) {
          const delay = 2000 * Math.pow(2, tentativas - 1);
          console.log(`[ML-HTTP] Aguardando ${delay}ms antes de retry...`);
          await esperar(delay, delay + 1000);
        }
      }
    }
  }

  console.log(`[ML-HTTP] Total: ${produtos.length} produtos`);
  return produtos.slice(0, 50);
}
