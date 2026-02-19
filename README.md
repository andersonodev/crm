# CRM SaaS para Turismo Receptivo

Este repositório contém a base de um CRM SaaS com:
- **Backend** em Django + Django Ninja + Celery + PostgreSQL
- **Frontend** em Next.js 14 + Shadcn/UI + React Query
- **Arquitetura multi-tenant** com `tenant_id`
- **Automação e IA** (Gemini + Groq)

## Estrutura de Pastas (Organização Principal)

```text
.
├── core/                         # Código backend já implementado (models, api, services, tasks)
├── src/                          # Código frontend App Router já implementado
├── backend/
│   ├── pyproject.toml            # Dependências e tooling Python
│   └── requirements/
│       ├── base.txt              # Dependências base de produção
│       └── dev.txt               # Dependências de desenvolvimento
├── frontend/
│   ├── package.json              # Dependências JS/TS e scripts
│   └── README.md                 # Guia de setup do frontend
├── docs/
│   ├── ARCHITECTURE.md           # Arquitetura completa (backend + frontend)
│   ├── API.md                    # Endpoints e contratos principais
│   ├── N8N_WORKFLOW.md           # Fluxo robusto de ingestão de e-mails
│   └── RUNBOOK.md                # Operação, deploy e troubleshooting
├── .env.example                  # Variáveis de ambiente sugeridas
└── docker-compose.yml            # Serviços base (PostgreSQL + Redis)
```

> Observação: o diretório `core/` e `src/` mantém os arquivos já existentes. A organização acima adiciona estrutura de governança, operação e padronização de dependências para escalar o projeto.

## Início Rápido

1. Copie variáveis de ambiente:
   - `cp .env.example .env`
2. Suba infraestrutura local:
   - `docker compose up -d postgres redis`
3. Instale backend:
   - `pip install -r backend/requirements/dev.txt`
4. Instale frontend:
   - `cd frontend && npm install`

## Documentação

- Arquitetura: `docs/ARCHITECTURE.md`
- API: `docs/API.md`
- n8n workflow: `docs/N8N_WORKFLOW.md`
- Runbook operacional: `docs/RUNBOOK.md`
