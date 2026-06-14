import { buscarProdutosML, buscarProdutosAmazon } from "./src/lib/mercadolivre";

async function main() {
  const termo = process.argv[2] || "notebook";
  console.log(`🧪 Testando busca integrada para o termo: "${termo}"\n`);

  console.log("--- 1. Testando Mercado Livre (Playwright + fallback HTTP) ---");
  const inicioML = Date.now();
  try {
    const produtosML = await buscarProdutosML(termo);
    const tempoML = Date.now() - inicioML;
    console.log(`✅ ML concluído em ${tempoML}ms: ${produtosML.length} produtos encontrados.`);
    if (produtosML.length > 0) {
      console.log(`   Exemplo: "${produtosML[0].titulo}" - R$ ${produtosML[0].preco}`);
    }
  } catch (err: any) {
    console.error("❌ Erro ao buscar ML:", err.message);
  }

  console.log("\n--- 2. Testando Amazon (Playwright) ---");
  const inicioAmazon = Date.now();
  try {
    const produtosAmazon = await buscarProdutosAmazon(termo);
    const tempoAmazon = Date.now() - inicioAmazon;
    console.log(`✅ Amazon concluída em ${tempoAmazon}ms: ${produtosAmazon.length} produtos encontrados.`);
    if (produtosAmazon.length > 0) {
      console.log(`   Exemplo: "${produtosAmazon[0].titulo}" - R$ ${produtosAmazon[0].preco}`);
    }
  } catch (err: any) {
    console.error("❌ Erro ao buscar Amazon:", err.message);
  }
}

main().catch(console.error);
