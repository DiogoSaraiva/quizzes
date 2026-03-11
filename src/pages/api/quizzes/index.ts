import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { Quiz } from "../../../lib/db";

export const GET: APIRoute = async () => {
	const { results } = await env.DB.prepare(
		"SELECT id, slug, title, description, subject, topic FROM quizzes ORDER BY subject ASC, topic ASC NULLS LAST, title ASC"
	).all<Quiz>();

	return Response.json(results);
};
