import { getSupabase, subscribeToRosterChanges } from './supabase-client.js';
import { auth } from './auth.js';

export const dataService = {
    currentRoster: null,
    subscription: null,
    
    async loadRoster(churchId) {
        const supabase = getSupabase();
        
        // Get or create roster for church
        let { data: roster, error } = await supabase
            .from('rosters')
            .select('*, weeks(*)')
            .eq('church_id', churchId)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // No roster exists, create one
            const { data: newRoster, error: createError } = await supabase
                .from('rosters')
                .insert({
                    church_id: churchId,
                    name: 'Main Roster',
                    created_by: auth.user.id
                })
                .select()
                .single();
            
            if (createError) throw createError;
            roster = newRoster;
        } else if (error) {
            throw error;
        }
        
        this.currentRoster = roster;
        
        // Subscribe to real-time changes
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        this.subscription = subscribeToRosterChanges(roster.id, (payload) => {
            this.handleRealtimeChange(payload);
        });
        
        return roster;
    },
    
    async addWeek(weekData) {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('weeks')
            .insert({
                roster_id: this.currentRoster.id,
                ...weekData
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async updateWeek(weekId, updates) {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('weeks')
            .update(updates)
            .eq('id', weekId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async deleteWeek(weekId) {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('weeks')
            .delete()
            .eq('id', weekId);
        
        if (error) throw error;
    },
    
    async addMember(name, email = null) {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('church_members')
            .insert({
                church_id: this.currentRoster.church_id,
                name: name,
                email: email,
                role: 'member'
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async getMembers() {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('church_members')
            .select('*')
            .eq('church_id', this.currentRoster.church_id);
        
        if (error) throw error;
        return data;
    },
    
    handleRealtimeChange(payload) {
        // Trigger app re-render when data changes
        window.dispatchEvent(new CustomEvent('roster-updated', { 
            detail: payload 
        }));
    },
    
    cleanup() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
};