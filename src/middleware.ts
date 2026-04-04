import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import type { User } from "./lib/db";

const PUBLIC = ["/login", "/register", "/privacy", "/api/auth/login", "/api/auth/register"];

export const onRequest = defineMiddleware(async (ctx, next) => {
	try {
		// Assets estáticos não devem passar por auth middleware.
		if (ctx.url.pathname.startsWith("/_astro/") || /\.[a-z0-9]+$/i.test(ctx.url.pathname)) {
			return next();
		}

		// Rotas públicas — sem verificação
		if (PUBLIC.some((p) => ctx.url.pathname.startsWith(p))) {
			return next();
		}

		const cookie = ctx.cookies.get("sid")?.value;

		if (cookie) {
			try {
				const session = await env.DB.prepare(
					"SELECT s.user_id, u.username, u.email, u.approved, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime('now')"
				)
					.bind(cookie)
					.first<Pick<User, "approved" | "username" | "email" | "role"> & { user_id: number }>();

				if (session && session.approved) {
					ctx.locals.user = {
						id: session.user_id,
						username: session.username,
						email: session.email,
						role: session.role,
					};
				}
			} catch (err) {
				console.error("Auth session check failed:", err);
				ctx.cookies.delete("sid");
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
	} catch (err) {
		console.error("Middleware error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
});
