#!/usr/bin/env node
/**
 * Aprova um utilizador pendente.
 *
 * Uso:
 *   node scripts/approve-user.js <username>          # produção
 *   node scripts/approve-user.js <username> --local  # local (dev)
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const username = process.argv[2];
const isLocal = process.argv.includes("--local");

if (!username) {
	console.error("Uso: node scripts/approve-user.js <username> [--local]\n");
	process.exit(1);
}

// Usernames só podem conter letras, números, hífens e underscores
if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
	console.error(`Username inválido: "${username}".`);
	process.exit(1);
}

const sql = `UPDATE users SET approved = 1 WHERE username = '${username}' AND approved = 0;`;
const tmpFile = join(tmpdir(), `approve-${Date.now()}.sql`);
writeFileSync(tmpFile, sql);

const locationFlag = isLocal ? " --local" : " --remote";
const cmd = `npx wrangler d1 execute quizzes --file="${tmpFile}"${locationFlag}`;

try {
	execSync(cmd, { stdio: "inherit" });
	console.log(`✓ Utilizador "${username}" aprovado.`);
} catch {
	console.error("✗ Erro ao aprovar.");
	process.exit(1);
} finally {
	unlinkSync(tmpFile);
}
