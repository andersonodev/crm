# Frontend (Next.js 14)

## Stack
- Next.js App Router
- Tailwind CSS + Shadcn/UI
- React Query
- TipTap
- Recharts

## Instalação

```bash
cd frontend
npm install
npm run dev
```

## Estrutura sugerida dentro de `src/`

```text
src/
  app/
    (auth)/
    (dashboard)/
      kanban/
      contacts/
      marketing/
      settings/
  components/
    ui/
    kanban/
    marketing/
    dashboard/
  hooks/
  lib/
  providers/
```

## Integração com backend

Configure `NEXT_PUBLIC_API_URL` no `.env` para apontar para os endpoints Django Ninja.
