import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { FeedbackWidget } from "@/components/FeedbackWidget";

export const metadata: Metadata = {
  title: "ComparaAqui — Compare preços de verdade",
  description:
    "Compare preços na Amazon, Kabum e Americanas e encontre a melhor oferta em tempo real.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Navbar />
        <main>{children}</main>
        <footer className="mt-20 border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © 2025 ComparaAqui. Todos os direitos reservados.
            </p>
            <p className="text-xs text-gray-300">
              Os preços podem variar. Sempre confira na loja antes de comprar.
            </p>
          </div>
        </footer>
        <FeedbackWidget />
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
