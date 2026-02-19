"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Client = { id: string; name: string; email: string; lifecycle_stage: string; is_top_10: boolean };

export default function ClientsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const { data } = useQuery({ queryKey: ["clients"], queryFn: async () => (await api.get<Client[]>("/clients")).data });

  const toggleTop10 = useMutation({
    mutationFn: async ({ id, is_top_10 }: { id: string; is_top_10: boolean }) => api.patch(`/clients/${id}/top10`, { is_top_10 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  const createClient = useMutation({
    mutationFn: async () => api.post("/clients", form),
    onSuccess: () => {
      setForm({ name: "", email: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Dialog>
          <DialogTrigger asChild><Button>Novo Cliente</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Cliente</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Button onClick={() => createClient.mutate()}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30"><tr><th className="p-2 text-left">Nome</th><th>Email</th><th>Status</th><th>LTV</th><th>Top 10</th></tr></thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.name}</td>
                <td>{c.email}</td>
                <td>{c.lifecycle_stage}</td>
                <td>--</td>
                <td><Switch checked={c.is_top_10} onCheckedChange={(value) => toggleTop10.mutate({ id: c.id, is_top_10: Boolean(value) })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
