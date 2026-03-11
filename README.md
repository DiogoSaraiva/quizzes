# Quizzes

Plataforma de quizzes interativos — Astro 6 + Cloudflare Workers + D1.

Desenhada para ser usada como módulo independente (ex: `outrosite.com/quizzes`), com quizzes gerados por IA a partir de slides e documentos de estudo.

---

## Stack

- **Astro 6** com `output: 'server'`
- **Cloudflare Workers** via `@astrojs/cloudflare` v13
- **Cloudflare D1** (SQLite) para persistência
- Sem framework frontend — JS vanilla em `<script>` tags

---

## Setup inicial

### 1. Criar a base de dados D1

```bash
npx wrangler d1 create quizzes
```

Copia o `database_id` gerado para `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "quizzes",
    "database_id": "SEU_ID_AQUI"
  }
]
```

### 2. Aplicar o schema

```bash
# Base de dados local (dev)
npx wrangler d1 execute quizzes --local --file=src/db/schema.sql

# Produção
npx wrangler d1 execute quizzes --file=src/db/schema.sql
```

### 3. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

---

## Estrutura da base de dados

```
quizzes       — cadeira, tema, slug, título, descrição
questions     — pergunta, explicação opcional, tipo, ordem
options       — texto, is_correct (0/1), ordem
attempts      — score, total, timestamp (anónimo)
```

**Campos:**
- `subject` — cadeira/disciplina (ex: `"Anatomia"`)
- `topic` — tema dentro da cadeira (ex: `"Sistema Nervoso"`). `NULL` = quiz geral da cadeira
- `explanation` — explicação da resposta correta, opcional por pergunta

---

## Importar quizzes

Os quizzes são gerados por Claude ou GPT e importados via script local (sem admin web).

### 1. Gerar o JSON com IA

Usa o prompt em [PROMPT.md](./PROMPT.md) e envia juntamente com os slides/matéria.

Formato esperado:

```json
{
  "title": "Anatomia — Sistema Nervoso",
  "description": "Neurónios, sinapses e sistema nervoso central",
  "subject": "Anatomia",
  "topic": "Sistema Nervoso",
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

> Para quiz **geral** de uma cadeira (sem tema): omite `"topic"`.
> O campo `"explanation"` é **opcional**.

### 2. Importar

```bash
# Testar localmente primeiro
npm run import-quiz -- quiz.json --local

# Publicar em produção
npm run import-quiz -- quiz.json
```

### 3. Apagar um quiz

```bash
npm run delete-quiz -- anatomia-sistema-nervoso-1
```

---

## Deploy

```bash
npm run deploy
```

Executa `astro build` seguido de `wrangler deploy`.

### Partilha da base de dados entre sites

A mesma D1 pode ser usada por múltiplos Workers — basta usar o mesmo `database_id` no `wrangler.jsonc` de cada site.

---

## Migrações

Se a base de dados já existe e precisas de adicionar colunas:

```bash
# Adicionar coluna topic (se ainda não existir)
npx wrangler d1 execute quizzes --file=src/db/migrate-add-topic.sql

# Adicionar coluna explanation
npx wrangler d1 execute quizzes --file=src/db/migrate-add-explanation.sql
```

---

## Navegação

A página inicial agrupa automaticamente os quizzes por cadeira e tema:

```
▶ Anatomia
    [Geral]  Anatomia — Quiz Geral
    Sistema Nervoso
      Anatomia — Sistema Nervoso
    Sistema Cardiovascular
      Anatomia — Sistema Cardiovascular

▶ Fisiologia
    ...
```

---

## Favicon

Para usar o favicon do site pai: substitui `public/favicon.svg` e `public/favicon.ico` pelos ficheiros do site pai.

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Build + preview local com wrangler |
| `npm run deploy` | Build + deploy para Cloudflare |
| `npm run import-quiz -- <file> [--local]` | Importar quiz JSON |
| `npm run delete-quiz -- <slug> [--local]` | Apagar quiz por slug |
