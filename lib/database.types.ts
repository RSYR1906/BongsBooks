export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          title: string;
          author: string | null;
          isbn: string | null;
          cover_url: string | null;
          description: string | null;
          genre: string[] | null;
          published_date: string | null;
          page_count: number | null;
          google_books_id: string | null;
          open_library_key: string | null;
          read_url: string | null;
          added_at: string;
          status: "want_to_read" | "reading" | "read" | null;
          reading_note: string | null;
          rating: number | null;
          read_progress: number | null;
          collections: string[] | null;
        };
        Insert: {
          id?: string;
          title: string;
          author?: string | null;
          isbn?: string | null;
          cover_url?: string | null;
          description?: string | null;
          genre?: string[] | null;
          published_date?: string | null;
          page_count?: number | null;
          google_books_id?: string | null;
          open_library_key?: string | null;
          read_url?: string | null;
          added_at?: string;
          status?: "want_to_read" | "reading" | "read" | null;
          reading_note?: string | null;
          rating?: number | null;
          read_progress?: number | null;
          collections?: string[] | null;
        };
        Update: Partial<Database["public"]["Tables"]["books"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Book = Database["public"]["Tables"]["books"]["Row"];
export type BookInsert = Database["public"]["Tables"]["books"]["Insert"];
