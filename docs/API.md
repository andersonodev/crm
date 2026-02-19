# API Reference (Resumo)

## Autenticação

- n8n / integrações server-to-server: header `X-API-KEY`
- frontend: JWT em `Authorization: Bearer <token>`

## Endpoints principais (core/api.py)

### 1. `POST /ingest/email`
Ingestão de e-mail e criação/atualização de Deal.

**Body**:
```json
{
  "sender": "lead@example.com",
  "body": "Quero pacote para 4 pessoas...",
  "thread_id": "optional-thread-id",
  "subject": "Opcional"
}
```

**Comportamento**:
- Se `thread_id` existe e já foi visto -> atualiza deal existente.
- Se novo -> tenta IA (Gemini -> Groq fallback) e cria deal.
- Se IA falha -> `stage = review_manual` (sem erro 500).

### 2. `POST /marketing/send`
Dispara processamento assíncrono da campanha.

**Body**:
```json
{ "campaign_id": "uuid" }
```

### 3. `GET /documents/voucher/{deal_id}`
Gera e retorna PDF de voucher.

### 4. `GET /tracking/pixel.png?tid=<uuid>`
Registra abertura de e-mail marketing.

## Contrato de IA

A extração deve retornar JSON com:
- `intent` (`Sales`/`Support`)
- `pax` (inteiro >= 0)
- `dates` (array ISO date)
- `summary` (texto)
- `sentiment` (`positive`/`neutral`/`negative`)
