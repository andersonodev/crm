# Arquitetura do Sistema CRM SaaS (Turismo Receptivo)

## 1) Visão Geral

O sistema é dividido em duas macro camadas:

1. **Backend (Django 5 + Ninja + Celery)**
   - Domínio CRM, financeiro, marketing e documentos
   - API orientada à integração com n8n
   - Processamento assíncrono para campanhas e IA
2. **Frontend (Next.js 14 + App Router)**
   - Painel operacional (Kanban, Dashboard, Marketing, Settings)
   - UX reativa com React Query e drag & drop
   - White-label via `TenantProvider`

## 2) Arquitetura de Pastas Recomendada

```text
backend/
  config/
    settings/
      base.py
      production.py
      development.py
    urls.py
    celery.py
  apps/
    core/
      models/
      api/
      services/
      tasks/
      selectors/
      repositories/
      tests/
  shared/
    logging/
    auth/
    exceptions/

frontend/
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
      forms/
    hooks/
    lib/
    providers/
    types/
    styles/
```

## 3) Backend: camadas e responsabilidades

- **models**: entidades persistidas (`Contact`, `Deal`, `CampaignLog`, etc.)
- **api**: controladores HTTP e schemas de entrada/saída
- **services**: regras de negócio puras (IA, PDF, workflows)
- **tasks**: execução assíncrona (Celery)
- **selectors**: consultas complexas e agregações
- **repositories**: acesso customizado a dados (query otimizada)

### 3.1 Multi-tenancy
- Todo agregado tem `tenant_id`
- Todos os endpoints devem filtrar por `tenant_id` autenticado
- Índices compostos por `tenant_id` para isolamento e performance

### 3.2 Estratégia JSONB (estilo EspoCRM)
- Campos flexíveis em `custom_attributes`, `ai_metadata`, `target_filters`, `metadata`
- Índices `GIN` para busca por conteúdo JSON

## 4) Frontend: princípios de organização

- **app/**: roteamento, layouts e páginas
- **components/**: componentes reutilizáveis por domínio
- **hooks/**: estado de servidor (React Query)
- **lib/**: cliente API, helpers, formatação
- **providers/**: contexto global (tenant, auth, query)

## 5) Integrações externas

- **n8n**: ingestão de e-mail via endpoint `POST /ingest/email`
- **Gemini + Groq**: análise de texto com fallback duplo
- **SMTP**: envio de campanhas em lote
- **WeasyPrint**: geração de vouchers PDF

## 6) Escalabilidade

- Escalar API com múltiplos workers (Gunicorn/Uvicorn)
- Escalar Celery separadamente por tipo de fila (marketing, ai)
- Redis dedicado para broker e cache
- PostgreSQL com tuning para JSONB e índices GIN

## 7) Segurança

- Chaves API com hash (`APIKey.key_hash`)
- JWT para frontend
- Sanitização de conteúdo de e-mail e logs
- Segredos apenas por variáveis de ambiente

## 8) Observabilidade

- Logs estruturados por tenant + correlation id
- Métricas de fila (tempo, retries, falhas)
- Tracing de endpoints críticos (`/ingest/email`, `/marketing/send`)
