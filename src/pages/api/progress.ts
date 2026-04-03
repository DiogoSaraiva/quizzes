import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

// GET /api/progress?quiz_id=X  ou  ?subject=X
export const GET: APIRoute = async ({ url, locals }) => {
	try {
		const userId = locals.user!.id;
		const quizId = url.searchParams.get("quiz_id");
		const subject = url.searchParams.get("subject");

		let type: string, ref: string;
		if (quizId) {
			type = "quiz"; ref = quizId;
		} else if (subject) {
			type = "exam"; ref = subject;
		} else {
			return new Response("Missing quiz_id or subject", { status: 400 });
		}

		const row = await env.DB.prepare(
			"SELECT current, correct FROM quiz_progress WHERE user_id = ? AND type = ? AND ref = ?"
		)
			.bind(userId, type, ref)
			.first<{ current: number; correct: number }>();

		return Response.json(row ?? null);
	} catch (err) {
		console.error("GET /api/progress error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
};

// POST /api/progress   body: { quiz_id?, subject?, current, correct }
export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const userId = locals.user!.id;
		let body: { quiz_id?: number; subject?: string; current: number; correct: number };
		try {
			body = await request.json();
		} catch {
			return new Response("Invalid JSON", { status: 400 });
		}

		const { quiz_id, subject, current, correct } = body;

		let type: string, ref: string;
		if (quiz_id != null) {
			type = "quiz"; ref = String(quiz_id);
		} else if (subject) {
			type = "exam"; ref = subject;
		} else {
			return new Response("Missing quiz_id or subject", { status: 400 });
		}

		await env.DB.prepare(
			`INSERT INTO quiz_progress (user_id, type, ref, current, correct, updated_at)
			 VALUES (?, ?, ?, ?, ?, datetime('now'))
			 ON CONFLICT(user_id, type, ref) DO UPDATE
			   SET current = excluded.current, correct = excluded.correct, updated_at = excluded.updated_at`
		)
			.bind(userId, type, ref, current, correct)
			.run();

		return Response.json({ ok: true });
	} catch (err) {
		console.error("POST /api/progress error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
};

// DELETE /api/progress   body: { quiz_id? } ou { subject? }
export const DELETE: APIRoute = async ({ request, locals }) => {
	try {
		const userId = locals.user!.id;
		let body: { quiz_id?: number; subject?: string };
		try {
			body = await request.json();
		} catch {
			return new Response("Invalid JSON", { status: 400 });
		}

		let type: string, ref: string;
		if (body.quiz_id != null) {
			type = "quiz"; ref = String(body.quiz_id);
		} else if (body.subject) {
			type = "exam"; ref = body.subject;
		} else {
			return new Response("Missing quiz_id or subject", { status: 400 });
		}

		await env.DB.prepare(
			"DELETE FROM quiz_progress WHERE user_id = ? AND type = ? AND ref = ?"
		)
			.bind(userId, type, ref)
			.run();

		return Response.json({ ok: true });
	} catch (err) {
		console.error("DELETE /api/progress error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
};
