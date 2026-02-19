"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmailEditor } from "@/components/marketing/EmailEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function MarketingEditorPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [htmlTemplate, setHtmlTemplate] = useState("<p>Olá {{ contact.name }},</p>");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveDraft = async () => {
    setIsSubmitting(true);
    try {
      await api.post("/marketing/campaigns", {
        subject,
        html_content: htmlTemplate,
        target_filters: {},
      });
      toast.success("Rascunho salvo com sucesso");
      router.push("/marketing");
    } catch (error) {
      toast.error("Falha ao salvar rascunho");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerNow = async () => {
    setIsSubmitting(true);
    try {
      const campaign = await api.post("/marketing/campaigns", {
        subject,
        html_content: htmlTemplate,
        target_filters: {},
      });
      await api.post(`/marketing/campaigns/${campaign.data.id}/send`);
      toast.success("Campanha enfileirada para disparo");
      router.push("/marketing");
    } catch (error) {
      toast.error("Falha ao disparar campanha");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Editor de Campanha</h1>
        <p className="text-sm text-muted-foreground">Crie e personalize e-mails para envio em massa.</p>
      </div>

      <Input placeholder="Assunto da campanha" value={subject} onChange={(event) => setSubject(event.target.value)} />
      <EmailEditor initialHTML={htmlTemplate} onChange={setHtmlTemplate} />

      <div className="flex gap-2">
        <Button variant="outline" disabled={isSubmitting} onClick={saveDraft}>
          Salvar Rascunho
        </Button>
        <Button disabled={isSubmitting} onClick={triggerNow}>
          Disparar Agora
        </Button>
      </div>
    </div>
  );
}
