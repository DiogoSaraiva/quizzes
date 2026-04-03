#!/usr/bin/env node
/**
 * Lista utilizadores pendentes de aprovação.
 *
 * Uso:
 *   node scripts/list-pending-users.js          # produção
 *   node scripts/list-pending-users.js --local  # local (dev)
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const isLocal = process.argv.includes("--local");

const sql = `SELECT id, username, email, created_at FROM users WHERE approved = 0 ORDER BY created_at ASC;`;
const tmpFile = join(tmpdir(), `list-pending-${Date.now()}.sql`);
writeFileSync(tmpFile, sql);

const locationFlag = isLocal ? " --local" : " --remote";
const cmd = `npx wrangler d1 execute quizzes --file="${tmpFile}"${locationFlag} --json`;

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
} catch {
	console.error("✗ Erro ao listar utilizadores.");
	process.exit(1);
} finally {
	unlinkSync(tmpFile);
}
