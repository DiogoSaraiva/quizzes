import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { hashPassword } from "../../../lib/auth";

const redirect = (url: URL | string, status = 303) =>
	new Response(null, { status, headers: { Location: url.toString() } });

export const POST: APIRoute = async ({ request }) => {
	try {
		const form = await request.formData();
		const username = (form.get("username") as string)?.trim();
		const email = (form.get("email") as string)?.trim().toLowerCase();
		const password = form.get("password") as string;
		const usernameRe = /^[A-Za-z0-9_-]+$/;

		if (!username || !email || !password) {
			return redirect(new URL("/register?error=invalid", request.url));
		}
		if (!usernameRe.test(username)) {
			return redirect(new URL("/register?error=username", request.url));
		}
		if (password.length < 8) {
			return redirect(new URL("/register?error=password", request.url));
		}

		const existing = await env.DB.prepare(
			"SELECT id FROM users WHERE username = ? OR email = ?"
		)
			.bind(username, email)
			.first();

		if (existing) {
			return redirect(new URL("/register?error=exists", request.url));
		}

		const { hash, salt } = await hashPassword(password);

		// O primeiro utilizador a registar-se torna-se admin e fica aprovado automaticamente
		const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
		const isFirst = !userCount || userCount.count === 0;

		await env.DB.prepare(
			"INSERT INTO users (username, email, password_hash, password_salt, approved, role) VALUES (?, ?, ?, ?, ?, ?)"
		)
			.bind(username, email, hash, salt, isFirst ? 1 : 0, isFirst ? "admin" : "user")
			.run();

		return redirect(new URL(isFirst ? "/register?success=1&admin=1" : "/register?success=1", request.url));
	} catch (err) {
		console.error("POST /api/auth/register error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
};
