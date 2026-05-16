import { initSupabase, getSupabase } from './supabase-client.js';

export const auth = {
    user: null,
    profile: null,
    
    async init() {
        await initSupabase();
        const supabase = getSupabase();
        
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.user = session.user;
            await this.loadProfile();
        }
        
        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.user = session.user;
                await this.loadProfile();
                // Create profile if doesn't exist
                await this.ensureProfile();
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.profile = null;
            }
        });
    },
    
    async signUp(email, password, username, fullName) {
        const supabase = getSupabase();
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    full_name: fullName
                }
            }
        });
        
        if (error) throw error;
        
        // Create profile immediately
        if (data.user) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                username,
                full_name: fullName,
                bio: ''
            });
        }
        
        return data;
    },
    
    async signIn(email, password) {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        return data;
    },
    
    async signOut() {
        const supabase = getSupabase();
        await supabase.auth.signOut();
        this.user = null;
        this.profile = null;
    },
    
    async loadProfile() {
        if (!this.user) return;
        
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', this.user.id)
            .single();
        
        if (!error) {
            this.profile = data;
        }
        return this.profile;
    },
    
    async updateProfile(updates) {
        if (!this.user) throw new Error('Not authenticated');
        
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date() })
            .eq('id', this.user.id)
            .select()
            .single();
        
        if (error) throw error;
        this.profile = data;
        return data;
    },
    
    async ensureProfile() {
        if (!this.user) return;
        
        const supabase = getSupabase();
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', this.user.id)
            .single();
        
        if (!existing) {
            const metadata = this.user.user_metadata || {};
            await supabase.from('profiles').insert({
                id: this.user.id,
                username: metadata.username || this.user.email.split('@')[0],
                full_name: metadata.full_name || '',
                bio: ''
            });
            await this.loadProfile();
        }
    },
    
    isAuthenticated() {
        return !!this.user;
    }
};