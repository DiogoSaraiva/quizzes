const enc = new TextEncoder();

export async function hashPassword(
	password: string,
	saltB64?: string
): Promise<{ hash: string; salt: string }> {
	const salt = saltB64
		? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
		: crypto.getRandomValues(new Uint8Array(16));

	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		"PBKDF2",
		false,
		["deriveBits"]
	);

	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
		key,
		256
	);

	return {
		hash: btoa(String.fromCharCode(...new Uint8Array(bits))),
		salt: btoa(String.fromCharCode(...salt)),
	};
}

export async function verifyPassword(
	password: string,
	storedHash: string,
	storedSalt: string
): Promise<boolean> {
	const { hash } = await hashPassword(password, storedSalt);
	return hash === storedHash;
}

export function generateSessionId(): string {
	return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
		.replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c] ?? c));
}

export function sessionExpiry(days = 7): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString();
}
