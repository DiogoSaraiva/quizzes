# Quizzes

App de quizzes de estudo deployada como Cloudflare Worker com D1 (SQLite).

Desenhada para ser usada como submodulo de um site Astro pai — a configuração da base de dados fica toda no pai.

## Stack

- **Astro 6** com `output: 'server'`
- **Cloudflare Workers** via `@astrojs/cloudflare` v13
- **Cloudflare D1** (SQLite)
- Vanilla JS, sem framework frontend

---

## Uso como submodulo (recomendado)

### 1. Adicionar ao repo pai

```bash
git submodule add <url-deste-repo> quizzes
git submodule update --init
```

### 2. Configurar o repo pai

No `wrangler.jsonc` do pai, adiciona o binding D1:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "quizzes",
    "database_id": "O-TEU-DATABASE-ID"
  }
]
```

Adiciona o script `scripts/setup-quizzes.js` ao repo pai:

```js
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";

const parentRaw = readFileSync(join(root, "wrangler.jsonc"), "utf-8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*/gm, "");
const parent = JSON.parse(parentRaw);

const db = parent.d1_databases?.find(d => d.database_name === "quizzes");
if (!db) {
  console.error('Binding D1 "quizzes" não encontrado em wrangler.jsonc');
  process.exit(1);
}

writeFileSync(join(root, "quizzes/wrangler.jsonc"), JSON.stringify({
  name: "quizzes",
  compatibility_date: parent.compatibility_date,
  compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
  assets: { binding: "ASSETS", directory: "./dist" },
  observability: { enabled: true },
  d1_databases: [db],
}, null, "\t"));

console.log("✓ quizzes/wrangler.jsonc gerado.");
```

No `package.json` do pai:

```json
"scripts": {
  "deploy:quizzes": "node scripts/setup-quizzes.js && cd quizzes && npm ci && npm run deploy"
}
```

### 3. Aplicar o schema

```bash
# Local
npx wrangler d1 execute quizzes --local --file=quizzes/src/db/schema.sql

# Produção
npx wrangler d1 execute quizzes --remote --file=quizzes/src/db/schema.sql
```

### 4. Rota no Cloudflare

No `wrangler.jsonc` do pai, adiciona a rota para o Worker de quizzes:

```jsonc
"routes": [
  { "pattern": "outrosite.com/quizzes*", "zone_name": "outrosite.com" }
]
```

### 5. Favicon

O submodulo copia automaticamente o favicon do pai antes de cada build.
O `public/` do pai deve estar em `../public/` relativamente à pasta `quizzes/`.

### 6. Deploy

```bash
npm run deploy:quizzes
```

O script gera o `wrangler.jsonc` do submodulo a partir da config do pai e faz deploy.

---

## Uso standalone

```bash
cp wrangler.example.jsonc wrangler.jsonc
npx wrangler d1 create quizzes   # copia o database_id para wrangler.jsonc
npx wrangler d1 execute quizzes --local --file=src/db/schema.sql
npm run dev
```

---

## Gestão de utilizadores

Os registos são aprovados manualmente:

```bash
npm run pending-users          # lista pendentes
npm run approve-user -- <username>   # aprova
```

Para produção, adiciona `--remote` (ou omite `--local`).

---

## Importar quizzes

Os quizzes são gerados por IA a partir de slides/documentos. Usa o prompt em [PROMPT.md](PROMPT.md).

Formato do JSON:

```json
{
  "title": "Anatomia — Sistema Nervoso",
  "description": "Neurónios, sinapses e sistema nervoso central",
  "subject": "Anatomia",
  "topic": "Sistema Nervoso",
  "topic_order": 1,
  "slug": "anatomia-sistema-nervoso-1",
  "questions": [
    {
      "text": "Qual é a unidade funcional do sistema nervoso?",
      "type": "multiple_choice",
      "order": 1,
      "explanation": "O neurónio é a célula responsável pela transmissão de impulsos elétricos.",
      "options": [
        { "text": "Célula glial", "is_correct": false },
        { "text": "Neurónio", "is_correct": true },
        { "text": "Axónio", "is_correct": false },
        { "text": "Sinapse", "is_correct": false }
      ]
    }
  ]
}
```

```bash
npm run import-quiz -- quiz.json          # produção
npm run import-quiz -- quiz.json --local  # local
npm run delete-quiz -- <slug>             # apagar
```

---

## Schema

```
users          (id, username, email, password_hash, password_salt, approved, created_at)
sessions       (id, user_id, expires_at)
quizzes        (id, slug, title, description, subject, topic, topic_order, created_at)
questions      (id, quiz_id, text, explanation, type, order)
options        (id, question_id, text, is_correct, order)
attempts       (id, quiz_id, user_id, score, total, completed_at)
quiz_progress  (user_id, type, ref, current, correct, updated_at)
```

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run deploy` | Build + deploy para Cloudflare |
| `npm run generate-types` | Gera tipos TypeScript |
| `npm run import-quiz -- <file> [--local]` | Importa quiz JSON |
| `npm run delete-quiz -- <slug> [--local]` | Apaga quiz por slug |
| `npm run pending-users [--local]` | Lista utilizadores pendentes |
| `npm run approve-user -- <username> [--local]` | Aprova utilizador |
