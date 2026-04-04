export interface Quiz {
	id: number;
	slug: string;
	title: string;
	description: string | null;
	/** Cadeira/disciplina (ex: "Anatomia") */
	subject: string | null;
	/** Tema dentro da cadeira (ex: "Sistema Nervoso"). null = quiz geral */
	topic: string | null;
	/** Posição do tema no índice (0, 1, 2...) */
	topic_order: number;
	uploaded_by: number | null;
	uploaded_by_username?: string | null;
	created_at: string;
}

export interface Question {
	id: number;
	quiz_id: number;
	text: string;
	explanation: string | null;
	type: "multiple_choice" | "true_false";
	order: number;
}

export interface Option {
	id: number;
	question_id: number;
	text: string;
	is_correct: number; // D1 devolve 0 ou 1
	order: number;
}

export interface QuestionWithOptions extends Question {
	options: Option[];
}

export interface QuizWithQuestions extends Quiz {
	questions: QuestionWithOptions[];
}

/**
 * Formato JSON que o Claude/GPT deve gerar.
 * - subject: cadeira (ex: "Anatomia") — obrigatório
 * - topic: tema (ex: "Sistema Nervoso") — omitir para quiz geral da cadeira
 * - slug: único, ex: "anatomia-sistema-nervoso-1"
 */
export interface User {
	id: number;
	username: string;
	email: string;
	password_hash: string;
	password_salt: string;
	approved: number; // 0 | 1
	role: "user" | "editor" | "admin";
	created_at: string;
}

export interface Session {
	id: string;
	user_id: number;
	expires_at: string;
}

export interface Attempt {
	id: number;
	quiz_id: number;
	user_id: number | null;
	score: number;
	total: number;
	completed_at: string;
}

export interface QuizImport {
	title: string;
	description?: string;
	subject: string;
	topic?: string;
	/** Posição do tema no índice da cadeira (0 = primeiro). Default: 0 */
	topic_order?: number;
	slug: string;
	questions: {
		text: string;
		explanation?: string;
		type: "multiple_choice" | "true_false";
		order: number;
		options: {
			text: string;
			is_correct: boolean;
		}[];
	}[];
}
