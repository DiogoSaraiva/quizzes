#!/usr/bin/env node
/**
 * Lista utilizadores pendentes de aprovação.
 *
 * Uso:
 *   node scripts/list-pending-users.js          # produção
 *   node scripts/list-pending-users.js --local  # local (dev)
 */

import { execSync } from "child_process";

const isLocal = process.argv.includes("--local");

const sql = `SELECT id, username, email, created_at FROM users WHERE approved = 0 ORDER BY created_at ASC;`;
const locationFlag = isLocal ? " --local" : " --remote";
const cmd = `npx wrangler d1 execute quizzes --command="${sql}"${locationFlag} --json`;

try {
	const output = execSync(cmd, { encoding: "utf-8" });
	const data = JSON.parse(output);
	const rows = data?.[0]?.results ?? [];

	if (rows.length === 0) {
		console.log("Nenhum utilizador pendente.");
	} else {
		console.log(`\n${rows.length} utilizador(es) pendente(s):\n`);
		for (const r of rows) {
			console.log(`  [${r.id}] ${r.username} <${r.email}>  —  ${r.created_at}`);
		}
		console.log(`\nPara aprovar: node scripts/approve-user.js <username>${isLocal ? " --local" : ""}\n`);
	}
} catch (err) {
	console.error("✗ Erro ao listar utilizadores.");
	if (err?.stderr) {
		console.error(String(err.stderr));
	}
	if (err?.stdout) {
		console.error(String(err.stdout));
	}
	if (err?.message) {
		console.error(err.message);
	}
	process.exit(1);
}
