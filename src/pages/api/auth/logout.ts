import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ cookies, request }) => {
	try {
		const sid = cookies.get("sid")?.value;
		if (sid) {
			await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
			cookies.delete("sid", { path: "/" });
		}
		return new Response(null, {
			status: 303,
			headers: { Location: new URL("/login", request.url).toString() },
		});
	} catch (err) {
		console.error("GET /api/auth/logout error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
};
