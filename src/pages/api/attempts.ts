import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		let body: { quiz_id: number; score: number; total: number };
		try {
			body = await request.json();
		} catch {
			return new Response("Invalid JSON", { status: 400 });
		}

		const { quiz_id, score, total } = body;
		if (
			typeof quiz_id !== "number" ||
			typeof score !== "number" ||
			typeof total !== "number"
		) {
			return new Response("Missing fields", { status: 400 });
		}

		const userId = locals.user?.id ?? null;

		await env.DB.prepare(
			"INSERT INTO attempts (quiz_id, user_id, score, total) VALUES (?, ?, ?, ?)"
		)
			.bind(quiz_id, userId, score, total)
			.run();

		return Response.json({ ok: true });
	} catch (err) {
		console.error("POST /api/attempts error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
};
