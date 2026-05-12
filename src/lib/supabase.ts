import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Magic-link emails redirect here with tokens in the URL hash; implicit flow + detectSessionInUrl picks them up.
// persistSession: false — session lives in memory only so a full page refresh ends the session (course / security requirement).
// Trade-off: closing the tab or refreshing always requires sign-in again; no cross-tab shared session via localStorage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: false,
    autoRefreshToken: true,
  },
});