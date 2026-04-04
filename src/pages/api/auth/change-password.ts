import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { hashPassword, verifyPassword } from "../../../lib/auth";

const redirect = (url: URL | string, status = 303) =>
	new Response(null, { status, headers: { Location: url.toString() } });

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		if (!locals.user) return redirect("/login?next=/profile");

		const form = await request.formData();
		const current = form.get("current_password") as string;
		const next = form.get("new_password") as string;
		const confirm = form.get("confirm_password") as string;

		if (!current || !next || !confirm) {
			return redirect("/profile?error=invalid");
		}
		if (next.length < 8) {
			return redirect("/profile?error=short");
		}
		if (next !== confirm) {
			return redirect("/profile?error=mismatch");
		}

		const row = await env.DB.prepare(
			"SELECT password_hash, password_salt FROM users WHERE id = ?"
		)
			.bind(locals.user.id)
			.first<{ password_hash: string; password_salt: string }>();

		if (!row) return redirect("/profile?error=invalid");

		const valid = await verifyPassword(current, row.password_hash, row.password_salt);
		if (!valid) return redirect("/profile?error=wrong");

		const { hash, salt } = await hashPassword(next);
		await env.DB.prepare(
			"UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?"
		)
			.bind(hash, salt, locals.user.id)
			.run();

		return redirect("/profile?success=1");
	} catch (err) {
		console.error("POST /api/auth/change-password error:", err);
		return new Response("Internal Server Error", { status: 500 });
	}
};
