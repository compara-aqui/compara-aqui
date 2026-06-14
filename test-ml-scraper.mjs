// Script de teste isolado para o scraper ML via HTTP
// Uso: node test-ml-scraper.mjs

async function teste() {
  console.log("🧪 Testando scraper ML via HTTP...\n");

  try {
    // Import dinâmico do módulo TypeScript compilado
    // Para rodar em dev, use: npx tsx test-ml-scraper.mjs
    const { buscarMercadoLivreHttp } = await import("./src/lib/scraper-ml-http.js");

    const termo = process.argv[2] || "notebook";
    console.log(`📦 Termo de busca: "${termo}"\n`);

    const inicio = Date.now();
    const resultado = await buscarMercadoLivreHttp(termo, 1);
    const tempoMs = Date.now() - inicio;

    console.log(`\n✅ Resultado: ${resultado.length} produtos em ${tempoMs}ms`);

    if (resultado.length > 0) {
      console.log("\n📋 Primeiros 3 produtos:");
      resultado.slice(0, 3).forEach((p, i) => {
        console.log(`\n  ${i + 1}. ${p.titulo}`);
        console.log(`     💰 R$ ${p.preco?.toFixed(2) || "N/A"}`);
        console.log(`     🏪 ${p.loja}`);
        console.log(`     🔗 ${p.urlProduto?.substring(0, 80)}...`);
        console.log(`     🖼️  ${p.imagemUrl ? "Sim" : "Não"}`);
        console.log(`     📦 Frete grátis: ${p.freteGratis ? "Sim" : "Não"}`);
      });
    } else {
      console.log("\n⚠️  Nenhum produto encontrado. Possíveis causas:");
      console.log("   - ML pode ter bloqueado o request");
      console.log("   - O termo de busca pode não ter resultados");
      console.log("   - Os seletores CSS podem precisar de ajuste");
    }
  } catch (err) {
    console.error("✗ Erro:", err);
  }

  process.exit(0);
}

teste();
