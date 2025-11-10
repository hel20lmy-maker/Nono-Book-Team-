
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

  const updateUser = async (userId: string, userData: Partial<User>) => {
      if (!supabase) throw new Error("Supabase not configured");
      
      const { name, phone, role, email, password } = userData;
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (!sessionUser) throw new Error("User not found for session");

      const isAdmin = state.currentUser?.role === UserRole.Admin;
      const isSelfEdit = sessionUser.id === userId;

      // Prevent admin from changing their own role
      if (isSelfEdit && isAdmin && role !== state.currentUser?.role) {
          throw new Error("Admins cannot change their own role.");
      }

      if (isSelfEdit) {
        // --- SELF-EDIT LOGIC ---
        const authUpdatePayload: any = {};
        const metadataUpdate: any = {};

        if (name && name !== sessionUser.user_metadata.name) metadataUpdate.name = name;
        if (phone && phone !== sessionUser.user_metadata.phone) metadataUpdate.phone = phone;
        // Self-edit cannot change role. The UI prevents this for non-admins,
        // and we have a check above to prevent admins from changing their own role.
        
        if (Object.keys(metadataUpdate).length > 0) {
            authUpdatePayload.data = { ...sessionUser.user_metadata, ...metadataUpdate };
        }

        if (email && email !== sessionUser.email) {
            authUpdatePayload.email = email;
        }
        if (password) {
            authUpdatePayload.password = password;
        }

        if (Object.keys(authUpdatePayload).length > 0) {
          const { error: authError } = await supabase.auth.updateUser(authUpdatePayload);
          if (authError) throw authError;
        }

      } else if (isAdmin) {
        // --- ADMIN EDITING ANOTHER USER ---
        if (email || password) {
            throw new Error("Admins cannot change email or password for other users. This should be disabled in the UI.");
        }

        const targetUser = state.users.find(u => u.id === userId);
        if (!targetUser) throw new Error("Target user not found in state.");

        const { error: rpcError } = await supabase.rpc('update_user_details_by_admin', {
          user_id_to_update: userId,
          new_name: name || targetUser.name,
          new_phone: phone || targetUser.phone,
          new_role: role || targetUser.role
        });

        if (rpcError) {
             if (rpcError.message.includes('function public.update_user_details_by_admin')) {
                throw new Error("User update failed: The required database function is missing. Please run the setup script again.");
             }
             throw rpcError;
        }
      } else {
          throw new Error("You do not have permission to edit this user.");
      }
      
      // The DB trigger (`handle_user_update`) will sync these changes to `public.users`.
      // To provide immediate UI feedback, we manually refetch the updated profile and dispatch it to the context.
      const { data: updatedProfile, error: refetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

      if (refetchError) {
        // Don't throw, just log, as the update likely succeeded but the RLS select might be slow to catch up.
        console.error("Failed to refetch user profile after update:", refetchError);
        return;
      }
      
      if(updatedProfile) {
        const userWithProfile: User = { ...mapToCamelCase(updatedProfile) };
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
