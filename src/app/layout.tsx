import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CompraAqui — Compare preços de verdade",
  description:
    "Compare preços no Mercado Livre e Amazon. Veja o histórico de preços e encontre a melhor oferta.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        <Navbar />
        <main>{children}</main>
        <footer className="mt-20 border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © 2025 CompraAqui. Todos os direitos reservados.
            </p>
            <p className="text-xs text-gray-300">
              Os preços podem variar. Sempre confira na loja antes de comprar.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
