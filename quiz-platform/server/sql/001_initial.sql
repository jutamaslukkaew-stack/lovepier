CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), google_sub text UNIQUE NOT NULL, email text UNIQUE NOT NULL, name text NOT NULL, avatar_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS quizzes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, title text NOT NULL, topic text NOT NULL, difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard')), content jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS quiz_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, answers jsonb NOT NULL, evaluation jsonb NOT NULL, score numeric(5,2), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS quizzes_user_id_idx ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS attempts_user_id_idx ON quiz_attempts(user_id);
