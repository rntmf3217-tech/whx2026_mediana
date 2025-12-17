import { createClient } from '@supabase/supabase-js';

// Use environment variables for configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://nhrqeegffxlsmreycscd.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ocnFlZWdmZnhsc21yZXljc2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTE2ODMsImV4cCI6MjA4MTQ2NzY4M30.LOoLI-BoOvBpV34onitwen7xiohIEp6TzFElPLVHiYI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // Disable auth persistence to avoid issues
  }
});
