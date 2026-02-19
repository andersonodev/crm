import "./globals.css";

import { Toaster } from "sonner";

import { AppQueryProvider } from "@/components/providers/query-provider";

export const metadata = {
  title: "CRM Turismo",
  description: "CRM SaaS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppQueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AppQueryProvider>
      </body>
    </html>
  );
}
