import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ cookies, request }) => {
	const sid = cookies.get("sid")?.value;
	if (sid) {
		await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
		cookies.delete("sid", { path: "/" });
	}
	return new Response(null, {
		status: 303,
		headers: { Location: new URL("/login", request.url).toString() },
	});
};
