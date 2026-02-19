# Runbook Operacional

## 1) Pré-requisitos
- Python 3.12+
- Node 20+
- Docker + Docker Compose

## 2) Subir infraestrutura

```bash
docker compose up -d postgres redis
```

## 3) Backend

```bash
pip install -r backend/requirements/dev.txt
```

Configurar `.env` com base em `.env.example`.

## 4) Frontend

```bash
cd frontend
npm install
npm run dev
```

## 5) Incidentes comuns

### 5.1 Campanhas não enviam
- Verificar variáveis SMTP (`MARKETING_SMTP_*`)
- Verificar worker Celery ativo
- Consultar `CampaignLog` com `event_type=failed`

### 5.2 IA não classifica e-mails
- Verificar `GEMINI_API_KEY` e `GROQ_API_KEY`
- Confirmar acesso externo de rede
- Inspecionar `Deal.ai_metadata.analysis_error`

### 5.3 PDF falha
- Validar HTML template em `DocumentTemplate`
- Verificar dependências do WeasyPrint no sistema operacional

## 6) Checklist de Deploy
1. Rodar migrations
2. Validar variáveis de ambiente
3. Health checks de banco e Redis
4. Subir API
5. Subir workers Celery
6. Subir frontend
7. Validar ingestão de e-mail e envio de campanha
