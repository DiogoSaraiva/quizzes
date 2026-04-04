import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const PATCH: APIRoute = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== "admin") {
		return new Response("Forbidden", { status: 403 });
	}

	const userId = Number(params.id);
	if (!userId || isNaN(userId)) {
		return Response.json({ error: "ID inválido" }, { status: 400 });
	}

	// Um admin não pode alterar o seu próprio papel/aprovação
	if (userId === locals.user.id) {
		return Response.json({ error: "Não podes alterar o teu próprio utilizador" }, { status: 400 });
	}

	let body: { approved?: number; role?: string };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "JSON inválido" }, { status: 400 });
	}

	const validRoles = ["user", "editor", "admin"];

	if (body.role !== undefined && !validRoles.includes(body.role)) {
		return Response.json({ error: "Role inválido" }, { status: 400 });
	}

	try {
		const existing = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
		if (!existing) return Response.json({ error: "Utilizador não encontrado" }, { status: 404 });

		if (body.approved !== undefined && body.role !== undefined) {
			await env.DB.prepare("UPDATE users SET approved = ?, role = ? WHERE id = ?")
				.bind(body.approved ? 1 : 0, body.role, userId)
				.run();
		} else if (body.approved !== undefined) {
			await env.DB.prepare("UPDATE users SET approved = ? WHERE id = ?")
				.bind(body.approved ? 1 : 0, userId)
				.run();
		} else if (body.role !== undefined) {
			await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?")
				.bind(body.role, userId)
				.run();
		} else {
			return Response.json({ error: "Nada a actualizar" }, { status: 400 });
		}

		return Response.json({ ok: true });
	} catch (err) {
		console.error(`PATCH /api/admin/users/${userId} error:`, err);
		return new Response("Internal Server Error", { status: 500 });
	}
};
