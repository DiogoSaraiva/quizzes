import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { User } from "../../../../lib/db";

export const GET: APIRoute = async ({ locals }) => {
	if (!locals.user || locals.user.role !== "admin") {
		return new Response("Forbidden", { status: 403 });
	}

	try {
		const { results } = await env.DB.prepare(
			"SELECT id, username, email, approved, role, created_at FROM users ORDER BY created_at ASC"
		).all<Pick<User, "id" | "username" | "email" | "approved" | "role" | "created_at">>();

		return Response.json(results);
	} catch (err) {
		console.error("GET /api/admin/users error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
};
