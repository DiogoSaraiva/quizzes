# Prompt para gerar quizzes com Claude / GPT

Copia este prompt e envia juntamente com os slides ou documento da matéria.

---

```
Analisa o conteúdo fornecido e cria um quiz de estudo.
Responde APENAS com JSON válido, sem texto antes ou depois, sem blocos de código (sem ```).

Formato obrigatório:
{
  "title": "Título descritivo do quiz",
  "description": "Uma frase sobre o que é abordado",
  "subject": "Nome da cadeira/disciplina",
  "topic": "Nome do tema/capítulo (omitir se for quiz geral da cadeira)",
  "slug": "cadeira-tema-numero",
  "questions": [
    {
      "text": "Texto da pergunta?",
      "type": "multiple_choice",
      "order": 1,
      "explanation": "Explicação breve de porque a resposta correta está certa.",
      "options": [
        { "text": "Opção A", "is_correct": false },
        { "text": "Opção B", "is_correct": true },
        { "text": "Opção C", "is_correct": false },
        { "text": "Opção D", "is_correct": false }
      ]
    }
  ]
}

Regras:
- Cria entre 15 e 25 perguntas
- Cada pergunta multiple_choice tem exatamente 4 opções, apenas 1 correta
- Perguntas de verdadeiro/falso usam type "true_false" com 2 opções: "Verdadeiro" e "Falso"
- O slug usa só minúsculas, sem acentos, palavras separadas por hífens (ex: "anatomia-sistema-nervoso-1")
- Cada pergunta deve ter um campo "explanation" com 1-2 frases a explicar porque a resposta correta está certa
- O campo "explanation" é opcional — omite se não houver explicação útil a acrescentar
- As perguntas devem cobrir os conceitos mais importantes do conteúdo
- Varia o tipo de pergunta: definições, aplicação, comparação, identificação
- Não repitas perguntas semelhantes
- Faz perguntas dificeis, já que esse quiz irá servir como elemento de estudo para aluno de licenciatura
```
