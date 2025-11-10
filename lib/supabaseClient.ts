import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ledsmgjpuibwcldrtjnw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZHNtZ2pwdWlid2NsZHJ0am53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjM4ODYsImV4cCI6MjA3ODI5OTg4Nn0.KMOzYbS5PaGWvvsggK_-_NbycxOrfGhzmnSsM04dYa8";

// FIX: Removed comparison to placeholder strings which caused a TypeScript error with hardcoded credentials.
const credentialsAreSet =
  supabaseUrl &&
  supabaseAnonKey;

let supabaseInstance: SupabaseClient | null = null;
if (credentialsAreSet) {
    try {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch(error) {
        console.error("Error creating supabase client", error);
    }
}

export const supabase = supabaseInstance;