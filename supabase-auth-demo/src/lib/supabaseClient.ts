import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}