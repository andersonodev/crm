# n8n Workflow — Ingestão de E-mail Blindada

## Objetivo
Garantir ingestão robusta no endpoint `POST /api/ingest/email` com limpeza, headers completos e política de erro segura.

## Fluxo de Nodes

1. **Gmail Trigger**
   - Poll: a cada 1 min
   - Filtro: mensagens sem label `CRM_PROCESSED`

2. **Function Node — Data Cleaning (Crítico)**
   - Normalizar `from`: `Nome <email@dominio.com>` -> `email@dominio.com`
   - Extrair:
     - `Message-ID`
     - `In-Reply-To`
     - `References`
   - Output sugerido:

```json
{
  "sender": "email@dominio.com",
  "subject": "Assunto",
  "body": "Conteúdo de texto",
  "message_id": "<...>",
  "in_reply_to": "<...>",
  "thread_id": "gmailThreadId"
}
```

3. **HTTP Request**
   - Method: `POST`
   - URL: `https://api.meucrm.com/api/ingest/email`
   - Headers:
     - `Content-Type: application/json`
     - `X-API-KEY: {{ $env.CRM_API_KEY }}`
   - Body: JSON do node anterior

4. **IF (status code >= 500)**
   - True -> **Catch/Error branch**
   - False -> ramo de sucesso

5. **Catch/Error Handling**
   - Não marcar como lido/processado
   - Enviar alerta Slack/Email Admin contendo payload + erro da API

6. **Sucesso**
   - Gmail Node: adicionar label `CRM_PROCESSED`
   - Opcional: manter como `UNREAD` para revisão humana

## Exemplo de Function Node (JavaScript)

```javascript
const item = $input.first().json;
const rawFrom = item.from || "";
const match = rawFrom.match(/<([^>]+)>/);
const sender = (match ? match[1] : rawFrom).trim().toLowerCase();

const headers = item.payload?.headers || [];
const byName = (name) => headers.find((h) => (h.name || '').toLowerCase() === name.toLowerCase())?.value || null;

return [{
  json: {
    sender,
    subject: item.subject || "",
    body: item.textPlain || item.snippet || "",
    message_id: byName("Message-ID"),
    in_reply_to: byName("In-Reply-To"),
    references: byName("References"),
    thread_id: item.threadId || null,
  }
}];
```
