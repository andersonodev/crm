"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useThemeStore } from "@/store/theme-store";

const schema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive(),
  username: z.string().min(1),
  password: z.string().min(1),
  use_tls: z.boolean().default(true),
  use_ssl: z.boolean().default(false),
  imap_host: z.string().min(1),
  imap_port: z.coerce.number().int().positive(),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const primaryColor = useThemeStore((s) => s.primaryColor);
  const sidebarColor = useThemeStore((s) => s.sidebarColor);
  const setPrimaryColor = useThemeStore((s) => s.setPrimaryColor);
  const setSidebarColor = useThemeStore((s) => s.setSidebarColor);
  const setLogoUrl = useThemeStore((s) => s.setLogoUrl);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      host: "",
      port: 587,
      username: "",
      password: "",
      use_tls: true,
      use_ssl: false,
      imap_host: "",
      imap_port: 993,
    },
  });

  const onDropLogo = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) setLogoFile(file);
  };

  const onSelectLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setLogoFile(file);
  };

  const onSaveBranding = async () => {
    const formData = new FormData();
    formData.append("primary_color", primaryColor);
    formData.append("sidebar_color", sidebarColor);
    if (logoFile) formData.append("logo_file", logoFile);

    try {
      const { data } = await api.patch("/tenant/config", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.logo_url) setLogoUrl(data.logo_url);
      toast.success("Branding atualizado");
    } catch {
      toast.error("Falha ao atualizar branding");
    }
  };

  const onTest = form.handleSubmit(async (values) => {
    try {
      const { data } = await api.post("/profile/test-connection", values);
      toast.success(data.message ?? "Conexão OK");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Falha no teste");
    }
  });

  const onSave = form.handleSubmit(async (values) => {
    try {
      await api.post("/profile/test-connection", values);
      await api.post("/profile/smtp", values);
      toast.success("Configuração salva");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? "Erro ao salvar");
    }
  });

  return (
    <div className="space-y-8">
      <section className="max-w-2xl space-y-4 rounded border bg-white p-4">
        <h2 className="text-xl font-semibold">Branding White Label</h2>
        <div
          className="rounded border border-dashed p-6 text-center text-sm text-slate-500"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropLogo}
        >
          Arraste a logo aqui ou
          <label className="ml-1 cursor-pointer underline">
            selecione um arquivo
            <input className="hidden" type="file" accept="image/*" onChange={onSelectLogo} />
          </label>
          {logoFile ? <p className="mt-2 text-slate-700">{logoFile.name}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Cor Primária
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="mt-1 block h-10 w-full" />
          </label>
          <label className="text-sm font-medium">Cor Sidebar
            <input type="color" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="mt-1 block h-10 w-full" />
          </label>
        </div>

        <Button onClick={onSaveBranding}>Salvar Branding</Button>
      </section>

      <section className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Configuração de E-mail (SMTP/IMAP)</h1>
        <Form {...form}>
          <form className="space-y-3">
            {(["host", "port", "username", "password", "imap_host", "imap_port"] as const).map((fieldName) => (
              <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldName}</FormLabel>
                    <FormControl>
                      <Input
                        type={fieldName.includes("password") ? "password" : fieldName.includes("port") ? "number" : "text"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField control={form.control} name="use_tls" render={({ field }) => (
              <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} /></FormControl><FormLabel>Usar TLS</FormLabel></FormItem>
            )} />
            <FormField control={form.control} name="use_ssl" render={({ field }) => (
              <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} /></FormControl><FormLabel>Usar SSL</FormLabel></FormItem>
            )} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onTest}>Testar Conexão</Button>
              <Button type="button" onClick={onSave}>Salvar</Button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}
