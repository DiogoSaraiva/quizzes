# Quizzes

App de quizzes de estudo como Cloudflare Worker + D1 (SQLite).  
Desenhada para correr como submodulo de um site Astro pai.

---

## Setup como submodulo

O quizzes corre como um **Cloudflare Worker** separado — fica em `quizzes.example.com` (ou domínio próprio). A configuração da base de dados fica no repo pai.

### 1. Adicionar ao repo pai

```bash
git submodule add <url-deste-repo> quizzes
git submodule update --init
```

### 2. Configurar o repo pai

**`wrangler.jsonc`** — adiciona o binding D1:

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "quizzes", "database_id": "O-TEU-DATABASE-ID" }
]
```

**`scripts/setup-quizzes.js`** — gera o `wrangler.jsonc` do submodulo a partir da config do pai:

```js
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const parent = JSON.parse(
  readFileSync(join(root, "wrangler.jsonc"), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*/gm, "")
);
const db = parent.d1_databases?.find(d => d.database_name === "quizzes");
if (!db) { console.error('Binding D1 "quizzes" não encontrado'); process.exit(1); }

writeFileSync(join(root, "quizzes/wrangler.jsonc"), JSON.stringify({
  name: "quizzes",
  compatibility_date: parent.compatibility_date,
  compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
  assets: { binding: "ASSETS", directory: "./dist" },
  d1_databases: [db],
}, null, "\t"));
console.log("✓ quizzes/wrangler.jsonc gerado.");
```

**`package.json`** do pai:

```json
"scripts": {
  "deploy:quizzes": "node scripts/setup-quizzes.js && cd quizzes && npm ci && npm run deploy"
}
```

### 3. Criar a base de dados

```bash
npx wrangler d1 create quizzes   # copia o database_id para wrangler.jsonc do pai
npx wrangler d1 execute quizzes --remote --file=quizzes/src/db/schema.sql
```

### 4. Primeiro deploy

```bash
npm run deploy:quizzes   # a partir do repo pai
```

### 5. Secrets

Gera um valor aleatório para o `ADMIN_SECRET` (password da API de admin):

```bash
openssl rand -hex 32
```

Depois adiciona-o ao Worker (o wrangler pede o valor interativamente):

```bash
cd quizzes
npx wrangler secret put ADMIN_SECRET
```

Guarda o valor num password manager — precisas dele para importar e apagar quizzes.

> **Vários sites, um Worker** — se vários sites partilharem o mesmo Worker (e a mesma D1), basta um único `ADMIN_SECRET`. Se quiseres dados isolados por site, cria um Worker separado por cada um e corre o comando com `--name quizzes-nome-do-site`.

### 6. CI automático (Cloudflare Pages do pai)

No dashboard do Pages project do **site pai**:

1. **Settings → Build & deployments → Build command**, muda para:
   ```
   npm run build && npm run deploy:quizzes
   ```
2. **Settings → Environment variables**, adiciona:
   ```
   CLOUDFLARE_API_TOKEN = <token com permissão Workers:Edit>
   ```

Assim cada push ao repo pai deploya o site pai **e** o Worker do quizzes.

### 7. Tema e cores

Cria `public/theme.css` no repo pai para sobrescrever as cores do submodulo:

```css
:root {
  --q-bg: #0f0a0a;
  --q-surface: #1a1010;
  --q-border: #3d2020;
  --q-border-hover: #7a3030;
  --q-text: #fdf2f2;
  --q-text-muted: #d4b0b0;
  --q-text-subtle: #9a7070;
  --q-accent: #be123c;
  --q-accent-hover: #9f1239;
  --q-accent-light: #fb7185;
  --q-correct: #166534;
  --q-correct-bg: #052e16;
  --q-correct-text: #86efac;
  --q-wrong: #991b1b;
  --q-wrong-bg: #450a0a;
  --q-wrong-text: #fca5a5;
}
```

O favicon e o `theme.css` são copiados automaticamente antes de cada build.

---

## Gestão de utilizadores

Os registos são aprovados manualmente:

```bash
npm run pending-users                    # lista pendentes
npm run approve-user -- <username>       # aprova
```

Para produção adiciona `--remote`; para local adiciona `--local`.

---

## Importar quizzes

Usa o prompt em [PROMPT.md](PROMPT.md) para gerar o JSON via IA. Formato esperado:

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

## Stack

- Astro 6 · `output: 'server'` · `@astrojs/cloudflare` v13
- Cloudflare Pages + D1 (SQLite)
- Vanilla JS, sem framework frontend
