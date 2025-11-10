import { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';

export const useAuth = () => {
  const { state, dispatch } = useContext(AppContext);

  useEffect(() => {
    if (!supabase) return;

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error("Error fetching profile:", error);
        } else if (profile) {
          // The profile table doesn't store email, get it from session
          const userWithProfile: User = { ...profile, email: session.user.email || '' };
          dispatch({ type: 'SET_CURRENT_USER', payload: userWithProfile });
        }
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error("Error fetching profile on auth change:", error);
           dispatch({ type: 'SET_CURRENT_USER', payload: null });
        } else if (profile) {
          const userWithProfile: User = { ...profile, email: session.user.email || '' };
          dispatch({ type: 'SET_CURRENT_USER', payload: userWithProfile });
        }
      } else {
        dispatch({ type: 'SET_CURRENT_USER', payload: null });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [dispatch]);


  const login = async (email: string, password_do_not_use: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: password_do_not_use,
    });
    if (error) throw error;
  };

  const logout = async () => {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    dispatch({ type: 'SET_CURRENT_USER', payload: null });
  };

  const register = async (userData: {name: string, email: string, phone: string, role: UserRole, password_do_not_use: string}) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { email, password_do_not_use, name, phone, role } = userData;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password_do_not_use,
      options: {
        data: {
          name: name,
          phone: phone,
          role: role,
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error("Registration failed, no user returned.");
    
    // The trigger will create the profile, so we don't need to do it here.
    return data.user;
  };

  const updateUser = async (userId: string, userData: Partial<User>, oldPassword?: string) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { name, phone, role, email, password } = userData;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== userId) throw new Error("Not authorized");

      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name, phone, role })
        .eq('id', userId);
      if (profileError) throw profileError;

      // Update email if changed
      if (email && email !== user.email) {
          const { error: emailError } = await supabase.auth.updateUser({ email });
          if (emailError) throw emailError;
      }
      
      // Update password if changed. Supabase doesn't require old password for update.
      if (password) {
          const { error: passwordError } = await supabase.auth.updateUser({ password });
          if (passwordError) throw passwordError;
      }
      
      // Re-fetch user to update state
       const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
      if(profile) {
        const userWithProfile: User = { ...profile, email: user.email || '' };
        dispatch({ type: 'UPDATE_USER', payload: userWithProfile });
      }
  };


  const deleteUser = async (userId: string) => {
    // Note: Deleting users directly is a sensitive operation.
    // In a real app, this should be a server-side function with admin checks.
    // This client-side implementation is for mock purposes.
    console.warn("User deletion should be handled by a secure backend function.");
    if (state.currentUser?.id === userId) {
        alert("You cannot delete your own account.");
        return;
    }
    // For now, we just remove from local state as there's no direct client-side delete.
    dispatch({ type: 'DELETE_USER', payload: userId });
  };

  return {
    session: state.currentUser ? { user: { id: state.currentUser.id } } : null, // Mock session object
    currentUser: state.currentUser,
    users: state.users, // This will need to be fetched from profiles table later
    loading: state.loading,
    login,
    logout,
    register,
    updateUser,
    deleteUser,
  };
};
