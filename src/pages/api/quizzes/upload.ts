import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { QuizImport } from "../../../lib/db";

export const POST: APIRoute = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return new Response("Unauthorized", { status: 401 });
	if (user.role !== "editor" && user.role !== "admin") {
		return new Response("Forbidden", { status: 403 });
	}

	let data: QuizImport;
	try {
		data = await request.json();
	} catch {
		return Response.json({ error: "JSON inválido" }, { status: 400 });
	}

	// Validação básica
	if (!data.title || !data.subject || !data.slug || !Array.isArray(data.questions)) {
		return Response.json({ error: "Campos obrigatórios em falta: title, subject, slug, questions" }, { status: 400 });
	}
	if (!/^[a-z0-9-]+$/.test(data.slug)) {
		return Response.json({ error: "slug inválido — só minúsculas, números e hífens" }, { status: 400 });
	}
	if (data.questions.length === 0) {
		return Response.json({ error: "O quiz deve ter pelo menos uma pergunta" }, { status: 400 });
	}

	try {
		// Remover quiz existente com o mesmo slug (substituição)
		const existing = await env.DB.prepare("SELECT id FROM quizzes WHERE slug = ?").bind(data.slug).first<{ id: number }>();
		if (existing) {
			await env.DB.prepare("DELETE FROM quizzes WHERE id = ?").bind(existing.id).run();
		}

		// Inserir quiz
		const quizResult = await env.DB.prepare(
			"INSERT INTO quizzes (slug, title, description, subject, topic, topic_order, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id"
		)
			.bind(
				data.slug,
				data.title,
				data.description ?? null,
				data.subject,
				data.topic ?? null,
				data.topic_order ?? 0,
				user.id,
			)
			.first<{ id: number }>();

		if (!quizResult) throw new Error("Falha ao criar quiz");
		const quizId = quizResult.id;

		// Inserir perguntas e opções
		for (const q of data.questions) {
			const qResult = await env.DB.prepare(
				`INSERT INTO questions (quiz_id, text, explanation, type, "order") VALUES (?, ?, ?, ?, ?) RETURNING id`
			)
				.bind(quizId, q.text, q.explanation ?? null, q.type ?? "multiple_choice", q.order ?? 0)
				.first<{ id: number }>();

			if (!qResult) throw new Error("Falha ao criar pergunta");
			const qId = qResult.id;

			for (let i = 0; i < q.options.length; i++) {
				const opt = q.options[i];
				await env.DB.prepare(
					`INSERT INTO options (question_id, text, is_correct, "order") VALUES (?, ?, ?, ?)`
				)
					.bind(qId, opt.text, opt.is_correct ? 1 : 0, i)
					.run();
			}
		}

		return Response.json({ ok: true, slug: data.slug, replaced: !!existing });
	} catch (err) {
		console.error("POST /api/quizzes/upload error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
};
