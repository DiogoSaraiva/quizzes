import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { Option, Question, Quiz } from "../../../lib/db";

export const GET: APIRoute = async ({ params }) => {
	const { id } = params;

	const quiz = await env.DB.prepare(
		"SELECT * FROM quizzes WHERE id = ? OR slug = ?"
	)
		.bind(id, id)
		.first<Quiz>();

	if (!quiz) {
		return new Response("Not found", { status: 404 });
	}

	const { results: questions } = await env.DB.prepare(
		'SELECT * FROM questions WHERE quiz_id = ? ORDER BY "order" ASC, id ASC'
	)
		.bind(quiz.id)
		.all<Question & { options?: Option[] }>();

	for (const q of questions) {
		const { results: options } = await env.DB.prepare(
			'SELECT * FROM options WHERE question_id = ? ORDER BY "order" ASC, id ASC'
		)
			.bind(q.id)
			.all<Option>();
		q.options = options;
	}

	return Response.json({ ...quiz, questions });
};
