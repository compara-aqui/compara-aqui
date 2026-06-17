import {
  buscarProdutosAmazon,
  buscarProdutosKabum,
  buscarProdutosAmericanas,
} from "./src/lib/lojas";

async function main() {
  const termo = process.argv[2] || "notebook";
  console.log(`🧪 Testando busca integrada para o termo: "${termo}"\n`);

  console.log("--- 1. Testando Amazon (HTTP) ---");
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

  console.log("\n--- 2. Testando Kabum (HTTP) ---");
  const inicioKabum = Date.now();
  try {
    const produtosKabum = await buscarProdutosKabum(termo);
    const tempoKabum = Date.now() - inicioKabum;
    console.log(`✅ Kabum concluído em ${tempoKabum}ms: ${produtosKabum.length} produtos encontrados.`);
    if (produtosKabum.length > 0) {
      console.log(`   Exemplo: "${produtosKabum[0].titulo}" - R$ ${produtosKabum[0].preco}`);
    }
  } catch (err: any) {
    console.error("❌ Erro ao buscar Kabum:", err.message);
  }

  console.log("\n--- 3. Testando Americanas (HTTP) ---");
  const inicioAmericanas = Date.now();
  try {
    const produtosAmericanas = await buscarProdutosAmericanas(termo);
    const tempoAmericanas = Date.now() - inicioAmericanas;
    console.log(`✅ Americanas concluída em ${tempoAmericanas}ms: ${produtosAmericanas.length} produtos encontrados.`);
    if (produtosAmericanas.length > 0) {
      console.log(`   Exemplo: "${produtosAmericanas[0].titulo}" - R$ ${produtosAmericanas[0].preco}`);
    }
  } catch (err: any) {
    console.error("❌ Erro ao buscar Americanas:", err.message);
  }
}

main().catch(console.error);
