"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, BarChart2 } from "lucide-react";

export function Navbar() {
  const [termo, setTermo] = useState("");
  const router = useRouter();

  function handleBusca(e: React.FormEvent) {
    e.preventDefault();
    if (termo.trim().length < 2) return;
    router.push(`/busca?q=${encodeURIComponent(termo.trim())}`);
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">
            Compra<span className="text-orange-500">Aqui</span>
          </span>
        </Link>

        <form onSubmit={handleBusca} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar produtos, marcas..."
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition"
            />
          </div>
        </form>
      </div>
    </nav>
  );
}