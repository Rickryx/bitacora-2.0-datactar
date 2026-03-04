
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string) => {
  try {
    return Boolean(new URL(url));
  } catch (e) {
    return false;
  }
};

// Fallback to avoid crash if env vars are missing/invalid during dev
const validUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey || 'placeholder-key';

if (!isValidUrl(supabaseUrl)) {
  console.error('CRITICAL: VITE_SUPABASE_URL is missing or invalid in .env.local');
}

export const supabase = createClient(validUrl, validKey);
