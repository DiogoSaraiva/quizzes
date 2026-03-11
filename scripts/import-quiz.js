#!/usr/bin/env node
/**
 * Importa um quiz JSON para a D1.
 *
 * Uso:
 *   node scripts/import-quiz.js quiz.json          # produção
 *   node scripts/import-quiz.js quiz.json --local  # base de dados local (dev)
 */

import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

const file = process.argv[2];
const isLocal = process.argv.includes("--local");

if (!file) {
	console.error(
		"Uso: node scripts/import-quiz.js <quiz.json> [--local]\n"
	);
	process.exit(1);
}

/** Escapa aspas simples para SQL */
function esc(s) {
	return String(s).replace(/'/g, "''");
}

function nullable(s) {
	return s != null ? `'${esc(s)}'` : "NULL";
}

const data = JSON.parse(readFileSync(file, "utf-8"));

if (!data.title || !data.slug || !Array.isArray(data.questions)) {
	console.error("JSON inválido: faltam campos title, slug ou questions.");
	process.exit(1);
}

const sql = [];

// Apaga quiz existente com o mesmo slug (CASCADE remove perguntas/opções)
sql.push(`DELETE FROM quizzes WHERE slug = '${esc(data.slug)}';`);

// Insere quiz
const topicOrder = Number(data.topic_order ?? 0);
sql.push(
	`INSERT INTO quizzes (slug, title, description, subject, topic, topic_order) VALUES (` +
		`'${esc(data.slug)}', '${esc(data.title)}', ${nullable(data.description)}, ` +
		`${nullable(data.subject)}, ${nullable(data.topic)}, ${topicOrder});`
);

// Insere perguntas e opções usando subqueries para evitar necessidade de IDs manuais
for (const q of data.questions) {
	const qText = esc(q.text);
	const qType = esc(q.type ?? "multiple_choice");
	const qOrder = Number(q.order ?? 0);

	const qExplanation = nullable(q.explanation);
	sql.push(
		`INSERT INTO questions (quiz_id, text, explanation, type, "order") ` +
			`SELECT id, '${qText}', ${qExplanation}, '${qType}', ${qOrder} FROM quizzes WHERE slug = '${esc(data.slug)}';`
	);

	for (let i = 0; i < q.options.length; i++) {
		const opt = q.options[i];
		const optText = esc(opt.text);
		const isCorrect = opt.is_correct ? 1 : 0;

		// Referencia a pergunta pelo quiz slug + texto + order (únicos no contexto)
		sql.push(
			`INSERT INTO options (question_id, text, is_correct, "order") ` +
				`SELECT qu.id, '${optText}', ${isCorrect}, ${i} ` +
				`FROM questions qu JOIN quizzes qz ON qu.quiz_id = qz.id ` +
				`WHERE qz.slug = '${esc(data.slug)}' AND qu.text = '${qText}' AND qu."order" = ${qOrder};`
		);
	}
}

const sqlContent = sql.join("\n");
const tmpFile = join(tmpdir(), `quiz-import-${Date.now()}.sql`);
writeFileSync(tmpFile, sqlContent);

const localFlag = isLocal ? " --local" : "";
const cmd = `npx wrangler d1 execute quizzes --file="${tmpFile}"${localFlag}`;

console.log(
	`A importar "${data.title}" (${data.questions.length} perguntas)...`
);

try {
	execSync(cmd, { stdio: "inherit" });
	console.log(`✓ Importado com sucesso → /${data.slug}`);
} catch {
	console.error("✗ Erro ao importar.");
	process.exit(1);
} finally {
	unlinkSync(tmpFile);
}
