"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type EmailEditorProps = {
  initialHTML?: string;
  onChange: (html: string) => void;
};

export function EmailEditor({ initialHTML = "", onChange }: EmailEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Link, Image],
    content: initialHTML,
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  const insertVariable = () => editor?.chain().focus().insertContent("{{ contact.name }}").run();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => editor?.chain().focus().toggleBold().run()}>
          Negrito
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const url = window.prompt("Informe a URL do link");
            if (url) editor?.chain().focus().setLink({ href: url }).run();
          }}
        >
          Link
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const src = window.prompt("Informe a URL da imagem");
            if (src) editor?.chain().focus().setImage({ src }).run();
          }}
        >
          Imagem
        </Button>
        <Button type="button" variant="secondary" onClick={insertVariable}>
          Inserir Variável
        </Button>
      </div>
      <div className="min-h-[280px] rounded-md border p-3">
        <EditorContent editor={editor} />
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            Preview
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview do E-mail</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded border p-4" dangerouslySetInnerHTML={{ __html: editor?.getHTML() ?? "" }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
