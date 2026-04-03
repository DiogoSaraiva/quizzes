import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { verifyPassword, generateSessionId, sessionExpiry } from "../../../lib/auth";
import type { User } from "../../../lib/db";

const redirect = (url: URL | string, status = 303) =>
	new Response(null, { status, headers: { Location: url.toString() } });

export const POST: APIRoute = async ({ request, cookies }) => {
	const form = await request.formData();
	const username = (form.get("username") as string)?.trim();
	const password = form.get("password") as string;
	const next = (form.get("next") as string) || "/";

	const loginUrl = new URL(`/login?next=${encodeURIComponent(next)}`, request.url);

	if (!username || !password) {
		loginUrl.searchParams.set("error", "invalid");
		return redirect(loginUrl);
	}

	const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?")
		.bind(username)
		.first<User>();

	if (!user) {
		loginUrl.searchParams.set("error", "invalid");
		return redirect(loginUrl);
	}

	if (!user.approved) {
		loginUrl.searchParams.set("error", "pending");
		return redirect(loginUrl);
	}

	const valid = await verifyPassword(password, user.password_hash, user.password_salt);
	if (!valid) {
		loginUrl.searchParams.set("error", "invalid");
		return redirect(loginUrl);
	}

	const sessionId = generateSessionId();
	const expiresAt = sessionExpiry(7);

	await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
		.bind(sessionId, user.id, expiresAt)
		.run();

	cookies.set("sid", sessionId, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		maxAge: 7 * 24 * 60 * 60,
		path: "/",
	});

	return redirect(new URL(next, request.url));
};
