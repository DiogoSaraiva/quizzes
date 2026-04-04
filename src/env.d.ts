/// <reference types="@cloudflare/workers-types" />

// Augmenta o módulo cloudflare:workers com os bindings desta app
declare module "cloudflare:workers" {
	interface Env {
		DB: D1Database;
		ASSETS: Fetcher;
	}
}

declare namespace App {
	interface Locals {
		user?: {
			id: number;
			username: string;
			email: string;
			role: "user" | "editor" | "admin";
		};
	}
}
