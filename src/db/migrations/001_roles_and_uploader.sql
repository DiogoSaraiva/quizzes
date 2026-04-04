-- Migration 001: Add user roles and quiz uploader
-- Run with: wrangler d1 execute <DB_NAME> --file=src/db/migrations/001_roles_and_uploader.sql

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE quizzes ADD COLUMN uploaded_by INTEGER;
