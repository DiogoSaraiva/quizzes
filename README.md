# Quizzes

App de quizzes de estudo deployada como Cloudflare Worker com D1 (SQLite). Pode ser servida em `outrosite.com/quizzes` ou como Worker independente.

## Stack

- **Astro 6** com `output: 'server'`
- **Cloudflare Workers** via `@astrojs/cloudflare` v13
- **Cloudflare D1** (SQLite)
- Vanilla JS, sem framework frontend

---

## Setup

### 1. Criar a base de dados D1

```bash
npx wrangler d1 create quizzes
```

Copia o `database_id` retornado para `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "quizzes",
    "database_id": "O-TEU-ID-AQUI"
  }
]
```

### 2. Aplicar o schema

```bash
# Local (dev)
npx wrangler d1 execute quizzes --local --file=src/db/schema.sql

# Produção
npx wrangler d1 execute quizzes --file=src/db/schema.sql
```

### 3. Gerar tipos TypeScript

```bash
npm run generate-types
```

### 4. Desenvolvimento

```bash
npm run dev
```

### 5. Deploy

```bash
npm run deploy
```

---

## Partilha da D1 entre Workers

A mesma base de dados pode ser usada por vários Workers — basta colocar o mesmo `database_id` no `wrangler.jsonc` de cada Worker.

---

## Importar quizzes

Não há admin web. Os quizzes são gerados por IA e importados via CLI.

### 1. Gerar o JSON

Usa o prompt em [PROMPT.md](PROMPT.md) juntamente com os slides ou documento da matéria.

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

| Campo | Obrigatório | Descrição |
|---|---|---|
| `slug` | sim | Identificador único (minúsculas, hífens) |
| `title` | sim | Título do quiz |
| `subject` | não | Cadeira/disciplina |
| `topic` | não | Tema/capítulo |
| `topic_order` | não | Ordem do tema dentro da cadeira (default: `0`) |
| `description` | não | Descrição curta |
| `questions[].explanation` | não | Explicação da resposta correta |

### 2. Importar

```bash
# Testar localmente
npm run import-quiz -- quiz.json --local

# Produção
npm run import-quiz -- quiz.json
```

O script apaga automaticamente o quiz com o mesmo `slug` antes de importar (idempotente).

### 3. Apagar

```bash
# Local
npm run delete-quiz -- anatomia-sistema-nervoso-1 --local

# Produção
npm run delete-quiz -- anatomia-sistema-nervoso-1
```

---

## Navegação

A página inicial agrupa por cadeira e ordena os temas por `topic_order`:

```
▶ Anatomia
    Quiz Geral  ← todas as perguntas de todos os temas, por ordem
    1. Sistema Nervoso
    2. Sistema Cardiovascular

▶ Fisiologia
    ...
```

O **Quiz Geral** (`/exam/[subject]`) agrega todas as perguntas da cadeira ordenadas por `topic_order → topic → order`.

---

## Schema

```
quizzes    (id, slug, title, description, subject, topic, topic_order, created_at)
questions  (id, quiz_id, text, explanation, type, order)
options    (id, question_id, text, is_correct, order)
attempts   (id, quiz_id, score, total, completed_at)
```

Schema completo em [`src/db/schema.sql`](src/db/schema.sql).

---

## Integração noutro site Astro

### Git submodulo

Na raiz do site pai:

```bash
git submodule add <url-do-repo-quizzes> quizzes
git submodule update --init
```

Estrutura resultante:

```
outrosite/
├── src/
├── public/
│   └── favicon.svg   ← favicon do pai
├── quizzes/          ← submodulo
│   ├── src/
│   ├── public/
│   └── wrangler.jsonc
└── package.json
```

### Base path

Em `astro.config.mjs`, adiciona `base`:

```js
export default defineConfig({
  base: '/quizzes',
  output: 'server',
  adapter: cloudflare({ imageService: "cloudflare" })
});
```

### Rota no Cloudflare

Em `wrangler.jsonc`, adiciona:

```jsonc
"routes": [
  { "pattern": "outrosite.com/quizzes*", "zone_name": "outrosite.com" }
]
```

O Worker responde apenas a `/quizzes/*` no domínio do pai, sem subdomínio separado.

### Favicon do pai

Com o submodulo, o `public/` do pai está em `../../public/` relativo ao submodulo. Adiciona um script de prebuild em `package.json`:

```json
"scripts": {
  "prebuild": "node scripts/copy-favicon.js",
  ...
}
```

`scripts/copy-favicon.js`:

```js
import { existsSync, copyFileSync, readdirSync } from "fs";
import { join } from "path";

const parentPublic = join(import.meta.dirname, "../../public");

if (!existsSync(parentPublic)) {
  console.log("Favicon do pai não encontrado, a usar o local.");
  process.exit(0);
}

const favicons = readdirSync(parentPublic).filter(f => f.startsWith("favicon"));
for (const f of favicons) {
  copyFileSync(join(parentPublic, f), join(import.meta.dirname, "../public", f));
  console.log(`Copiado: ${f}`);
}
```

Se o pai existir (ex: CI com submodulo), copia o favicon. Se não (deploy standalone), usa o ficheiro local sem erros.

### Deploy

No CI, garante que os submodulos são inicializados antes do deploy:

```bash
git submodule update --init --recursive
cd quizzes && npm install && npm run deploy
```

Ou no `package.json` do pai:

```json
"scripts": {
  "deploy:quizzes": "cd quizzes && npm install && npm run deploy"
}
```

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Build + preview local com Wrangler |
| `npm run deploy` | Build + deploy para Cloudflare |
| `npm run generate-types` | Gera tipos TypeScript a partir dos bindings |
| `npm run import-quiz -- <file> [--local]` | Importa quiz JSON para a D1 |
| `npm run delete-quiz -- <slug> [--local]` | Apaga quiz por slug da D1 |
