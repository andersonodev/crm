"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = { id: string; name: string; category: string; keywords: string[] };

export default function ProductsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");

  const { data } = useQuery({ queryKey: ["products"], queryFn: async () => (await api.get<Product[]>("/products")).data });
  const createProduct = useMutation({
    mutationFn: async () => api.post("/products", { name, category, keywords: keywords.split(",").map((x) => x.trim()).filter(Boolean) }),
    onSuccess: () => {
      setName("");
      setCategory("");
      setKeywords("");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Catálogo de Produtos (Treino IA)</h1>
      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input placeholder="keywords separadas por vírgula" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        <Button onClick={() => createProduct.mutate()}>Adicionar</Button>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30"><tr><th className="p-2 text-left">Produto</th><th>Categoria</th><th>Keywords</th></tr></thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.name}</td>
                <td>{p.category}</td>
                <td>{p.keywords.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
