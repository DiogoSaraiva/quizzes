#!/usr/bin/env node
/**
 * Apaga um quiz pelo slug.
 *
 * Uso:
 *   node scripts/delete-quiz.js <slug>          # produção
 *   node scripts/delete-quiz.js <slug> --local  # base de dados local
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const slug = process.argv[2];
const isLocal = process.argv.includes("--local");

if (!slug) {
	console.error("Uso: node scripts/delete-quiz.js <slug> [--local]");
	process.exit(1);
}

// Slugs só podem conter letras minúsculas, números e hífens
if (!/^[a-z0-9-]+$/.test(slug)) {
	console.error(`Slug inválido: "${slug}". Apenas letras minúsculas, números e hífens são permitidos.`);
	process.exit(1);
}

// Usa --file em vez de --command para evitar shell injection
const sql = `DELETE FROM quizzes WHERE slug = '${slug}';`;
const tmpFile = join(tmpdir(), `delete-quiz-${Date.now()}.sql`);
writeFileSync(tmpFile, sql);

const locationFlag = isLocal ? " --local" : " --remote";
const cmd = `npx wrangler d1 execute quizzes --file="${tmpFile}"${locationFlag}`;

try {
	execSync(cmd, { stdio: "inherit" });
	console.log(`✓ Quiz "${slug}" apagado.`);
} catch {
	console.error("✗ Erro ao apagar.");
	process.exit(1);
} finally {
	unlinkSync(tmpFile);
}
