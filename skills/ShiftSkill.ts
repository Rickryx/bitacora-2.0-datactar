import { supabase } from '../services/supabase';

/**
 * ShiftSkill
 * 
 * Provides discrete functions for managing security guard shifts.
 * This follows the 'Skills' pattern for agentic integration.
 */
export const ShiftSkill = {
    /**
     * Checks if the user has an active shift.
     */
    async getActiveShift(userId: string) {
        const { data, error } = await supabase
            .from('shifts')
            .select('*, entities(name)')
            .eq('user_id', userId)
            .eq('status', 'ACTIVE')
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Starts a programmed shift for the user.
     */
    async startShift(userId: string) {
        const { data: pendingShift, error: fetchError } = await supabase
            .from('shifts')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'PENDING')
            .order('scheduled_start', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!pendingShift) throw new Error("No pending shift found for user.");

        const { data, error } = await supabase
            .from('shifts')
            .update({
                status: 'ACTIVE',
                actual_start: new Date().toISOString()
            })
            .eq('id', pendingShift.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Ends the current active shift.
     */
    async endShift(shiftId: string) {
        const { data, error } = await supabase
            .from('shifts')
            .update({
                status: 'COMPLETED',
                actual_end: new Date().toISOString()
            })
            .eq('id', shiftId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
