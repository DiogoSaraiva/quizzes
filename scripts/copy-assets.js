#!/usr/bin/env node
/**
 * Copia assets do repo pai (favicon + theme.css) para public/.
 * Executado automaticamente antes do build quando usado como submodulo.
 * Silencioso se o pai não existir (uso standalone).
 */

import { existsSync, copyFileSync, readdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../public");
const parentPublic = join(dirname(fileURLToPath(import.meta.url)), "../../public");

if (!existsSync(parentPublic)) {
	// Standalone — sem pai, usa assets locais
	process.exit(0);
}

let copied = 0;
const parentFiles = readdirSync(parentPublic);

// Favicon
for (const f of parentFiles.filter((f) => f.startsWith("favicon"))) {
	copyFileSync(join(parentPublic, f), join(publicDir, f));
	copied++;
}

// Logo (opcional): qualquer ficheiro com prefixo logo.
for (const f of parentFiles.filter((f) => f.startsWith("logo"))) {
	copyFileSync(join(parentPublic, f), join(publicDir, f));
	copied++;
}

// theme.css — sobrescreve as CSS variables do quizzes com o tema do pai
if (existsSync(join(parentPublic, "theme.css"))) {
	copyFileSync(join(parentPublic, "theme.css"), join(publicDir, "theme.css"));
	copied++;
}

// Evita favicon antigo local quando o pai só fornece favicon.svg.
const parentIco = join(parentPublic, "favicon.ico");
const localIco = join(publicDir, "favicon.ico");
if (!existsSync(parentIco) && existsSync(localIco)) {
	rmSync(localIco);
}

// Evita logo antigo local quando o pai não fornece logo.
if (!parentFiles.some((f) => f.startsWith("logo"))) {
	for (const f of readdirSync(publicDir).filter((f) => f.startsWith("logo"))) {
		rmSync(join(publicDir, f));
	}
}

if (copied > 0) {
	console.log(`✓ ${copied} asset(s) copiado(s) do pai.`);
}
