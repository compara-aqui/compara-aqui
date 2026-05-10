import axios from "axios";

const BASE_URL = "https://api.mercadolibre.com";

// Guarda o token em memória para não buscar um novo a cada requisição
let tokenCache: { token: string; expira: number } | null = null;

async function getToken(): Promise<string> {
  // Se já tem token válido, reutiliza
  if (tokenCache && Date.now() < tokenCache.expira) {
    return tokenCache.token;
  }

  const appId = process.env.ML_APP_ID;
  const secret = process.env.ML_SECRET;

  if (!appId || !secret) {
    throw new Error("ML_APP_ID e ML_SECRET não configurados no .env");
  }

  const { data } = await axios.post(
    "https://api.mercadolibre.com/oauth/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: appId,
      client_secret: secret,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }
  );

  // Salva o token em cache (expira em 6 horas, salvamos com 5 min de margem)
  tokenCache = {
    token: data.access_token,
    expira: Date.now() + (data.expires_in - 300) * 1000,
  };

  return tokenCache.token;
}

export async function buscarProdutosML(termo: string) {
  const token = await getToken();

  const { data } = await axios.get(`${BASE_URL}/sites/MLB/search`, {
    params: {
      q: termo,
      limit: 20,
    },
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    timeout: 10000,
  });

  return data.results.map((item: any) => ({
    id: item.id,
    titulo: item.title,
    preco: item.price,
    imagem: item.thumbnail?.replace("I.jpg", "O.jpg") || "",
    urlProduto: item.permalink,
    loja: "mercadolivre" as const,
    frete: item.shipping?.free_shipping ? 0 : -1,
    disponivel: true,
  }));
}

export async function detalhesProdutoML(mlId: string) {
  try {
    const token = await getToken();

    const { data } = await axios.get(`${BASE_URL}/items/${mlId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    return {
      id: data.id,
      titulo: data.title,
      preco: data.price,
      imagem: data.pictures?.[0]?.url || data.thumbnail || "",
      urlProduto: data.permalink,
      loja: "mercadolivre" as const,
      categoria: data.category_id,
      marca: data.attributes?.find((a: any) => a.id === "BRAND")?.value_name,
      frete: data.shipping?.free_shipping ? 0 : -1,
      disponivel: data.status === "active",
    };
  } catch (error) {
    console.error("Erro ao buscar detalhes no ML:", error);
    return null;
  }
}
