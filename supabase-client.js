import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

let supabaseClient = null;

export async function initSupabase() {
    if (!supabaseClient) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    }
    return supabaseClient;
}

export function getSupabase() {
    if (!supabaseClient) {
        throw new Error('Supabase not initialized. Call initSupabase() first.');
    }
    return supabaseClient;
}

// Real-time subscription helper
export function subscribeToRosterChanges(rosterId, callback) {
    const supabase = getSupabase();
    return supabase
        .channel(`roster:${rosterId}`)
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'weeks', filter: `roster_id=eq.${rosterId}` },
            callback
        )
        .subscribe();
}