#!/usr/bin/env node
/**
 * Apaga um quiz pelo slug.
 *
 * Uso:
 *   node scripts/delete-quiz.js <slug>          # produção
 *   node scripts/delete-quiz.js <slug> --local  # base de dados local
 */

import { execSync } from "child_process";

const slug = process.argv[2];
const isLocal = process.argv.includes("--local");

if (!slug) {
	console.error("Uso: node scripts/delete-quiz.js <slug> [--local]");
	process.exit(1);
}

const safeSlug = slug.replace(/'/g, "''");
const localFlag = isLocal ? " --local" : "";
const cmd = `npx wrangler d1 execute quizzes --command "DELETE FROM quizzes WHERE slug = '${safeSlug}'"${localFlag}`;

try {
	execSync(cmd, { stdio: "inherit" });
	console.log(`✓ Quiz "${slug}" apagado.`);
} catch {
	console.error("✗ Erro ao apagar.");
	process.exit(1);
}
