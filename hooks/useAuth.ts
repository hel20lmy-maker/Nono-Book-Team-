
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { mapToCamelCase } from '../lib/utils';

export const useAuth = () => {
  const { state, dispatch } = useContext(AppContext);

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
    
    // A trigger is expected to create the public profile.
    // After registration, the onAuthStateChange listener in AppContext will handle reloading data.
    return data.user;
  };

  const updateUser = async (userId: string, userData: Partial<User>, oldPassword?: string) => {
      if (!supabase) throw new Error("Supabase not configured");
      // Supabase policies will handle authorization
      const { name, phone, role, email, password } = userData;

      // Update profile data in public.users table
      const { error: profileError } = await supabase
        .from('users')
        .update({ name, phone, role, email }) // email might be updated here too
        .eq('id', userId);
      if (profileError) throw profileError;

      // Update auth.users data (email, password)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      let authUpdatePayload: any = {};
      if (email && email !== user.email) {
          authUpdatePayload.email = email;
      }
      if (password) {
          authUpdatePayload.password = password;
      }

      if (Object.keys(authUpdatePayload).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdatePayload);
        if (authError) throw authError;
      }
      
      // Re-fetch user to update state
       const { data: profile, error: refetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

      if (refetchError) throw refetchError;
      
      if(profile) {
        const userWithProfile: User = { ...mapToCamelCase(profile), email: user.email || profile.email };
        dispatch({ type: 'UPDATE_USER', payload: userWithProfile });
      }
  };


  const deleteUser = async (userId: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    if (state.currentUser?.id === userId) {
        alert("You cannot delete your own account.");
        return;
    }
    
    // Call the PostgreSQL function to safely delete the user from auth and public schemas.
    const { error } = await supabase.rpc('delete_user_by_id', {
      user_id_to_delete: userId
    });

    if (error) {
        console.error("Error deleting user:", error);
        // The error might be because the function doesn't exist yet.
        if (error.message.includes('function public.delete_user_by_id')) {
             alert('Deletion failed: The required database function is missing. Please run the setup script from the SQL Editor in your Supabase dashboard to apply the latest updates.');
        } else {
            alert(`An error occurred while deleting the user: ${error.message}`);
        }
        throw error;
    }
    
    dispatch({ type: 'DELETE_USER', payload: userId });
  };

  return {
    session: state.currentUser ? { user: { id: state.currentUser.id } } : null,
    currentUser: state.currentUser,
    loading: state.loading,
    dbError: state.dbError,
    users: state.users,
    login,
    logout,
    register,
    updateUser,
    deleteUser,
  };
};
