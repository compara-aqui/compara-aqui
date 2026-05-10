const BASE_URL = "https://api.mercadolibre.com";

export async function buscarProdutosML(termo: string) {
  const url = `${BASE_URL}/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=20`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CompraAqui/1.0)",
      Accept: "application/json",
    },
    next: { revalidate: 300 }, // cache de 5 minutos
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Erro ${res.status} ao buscar no ML`);
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) return [];

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
    const res = await fetch(`${BASE_URL}/items/${mlId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CompraAqui/1.0)",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const data = await res.json();

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
    console.error("Erro detalhes ML:", error);
    return null;
  }
}
