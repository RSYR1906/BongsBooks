-- Run this SQL in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → paste and run

CREATE TABLE books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  isbn text,
  cover_url text,
  description text,
  genre text[],
  published_date text,
  page_count int,
  google_books_id text,
  open_library_key text,
  read_url text,
  added_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (safe default)
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Allow all operations from the anon key (single-user app protected by password middleware)
CREATE POLICY "Allow all for anon" ON books
  FOR ALL
  USING (true)
  WITH CHECK (true);
