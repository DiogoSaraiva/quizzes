import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import type { User } from "./lib/db";

const PUBLIC = ["/login", "/register", "/privacy", "/api/auth/login", "/api/auth/register"];

export const onRequest = defineMiddleware(async (ctx, next) => {
	// Rotas públicas — sem verificação
	if (PUBLIC.some((p) => ctx.url.pathname.startsWith(p))) {
		return next();
	}

	const cookie = ctx.cookies.get("sid")?.value;

	if (cookie) {
		const session = await env.DB.prepare(
			"SELECT s.user_id, u.username, u.email, u.approved FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime('now')"
		)
			.bind(cookie)
			.first<Pick<User, "approved" | "username" | "email"> & { user_id: number }>();

		if (session && session.approved) {
			ctx.locals.user = {
				id: session.user_id,
				username: session.username,
				email: session.email,
			};
		}
	}

	// Rotas protegidas — redireciona para login se não autenticado
	const isApi = ctx.url.pathname.startsWith("/api/");
	if (!ctx.locals.user && !isApi) {
		return ctx.redirect(`/login?next=${encodeURIComponent(ctx.url.pathname)}`);
	}
	if (!ctx.locals.user && isApi) {
		return new Response("Unauthorized", { status: 401 });
	}

	return next();
});
