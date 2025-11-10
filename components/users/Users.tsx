import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { User, UserRole } from '../../types';
import { XCircleIcon, PlusCircleIcon, LogOutIcon } from '../ui/Icons';

// Modal component for Add/Edit form
const UserFormModal: React.FC<{
  userToEdit?: User | null;
  onClose: () => void;
  onSave: (userData: any, userId?: string, oldPassword?: string) => Promise<void>;
  existingUsers: User[];
}> = ({ userToEdit, onClose, onSave, existingUsers }) => {
  const isEditMode = !!userToEdit;
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === UserRole.Admin;
  const isSelfEdit = isEditMode && userToEdit?.id === currentUser?.id;

  const [formData, setFormData] = useState({
    name: userToEdit?.name || '',
    email: userToEdit?.email || '',
    phone: userToEdit?.phone || '',
    role: userToEdit?.role || UserRole.Sales,
  });
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- Validation ---
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (isSelfEdit && newPassword && !oldPassword) {
      // Supabase does not require old password for update, so we can remove this client-side check.
      // setError("Current password is required to set a new password.");
      // return;
    }

    if (!isEditMode && !newPassword) {
      setError('Password is required for new users.');
      return;
    }
    
    const checkEmail = formData.email.toLowerCase();
    const emailExists = existingUsers.some(user => 
        user.email.toLowerCase() === checkEmail && user.id !== userToEdit?.id
    );

    if (emailExists) {
        setError('A user with this email already exists.');
        return;
    }

    // --- Save Logic ---
    setIsSubmitting(true);
    try {
        let dataToSave: any;
        if (!isEditMode) {
            dataToSave = { ...formData, password_do_not_use: newPassword };
        } else {
            dataToSave = { ...formData };
            if (newPassword) {
                dataToSave.password = newPassword;
            }
        }
        await onSave(dataToSave, userToEdit?.id, oldPassword);
        onClose();
    } catch (err: any) {
        setError(err.message || 'An error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{isEditMode ? 'Edit User' : 'Add New User'}</h3>
                <button onClick={onClose}><XCircleIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
            </div>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" required disabled={isSubmitting} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" required disabled={isSubmitting} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" required disabled={isSubmitting} />
                </div>
                {isAdmin && (
                    <div>
                        <label className="block text-sm font-medium">Role</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" disabled={isSubmitting || userToEdit?.id === currentUser?.id}>
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                         {userToEdit?.id === currentUser?.id && <p className="text-xs text-gray-500 mt-1">Admins cannot change their own role.</p>}
                    </div>
                )}

                <div className="pt-2 border-t">
                    <h4 className="text-md font-semibold text-gray-800 mb-2">{isEditMode ? 'Change Password' : 'Set Password'}</h4>
                    {isSelfEdit && (
                        <div>
                            <label className="block text-sm font-medium">Current Password</label>
                            <input type="password" name="oldPassword" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Not required by Supabase, but good practice" className="mt-1 w-full border-gray-300 rounded-md shadow-sm" disabled={isSubmitting} />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium">New Password</label>
                        <input type="password" name="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={isEditMode ? "Leave blank to keep current" : "Required for new user"} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" disabled={isSubmitting} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Confirm New Password</label>
                        <input type="password" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" disabled={isSubmitting} />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-400" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};


const Users: React.FC = () => {
    const { currentUser, updateUser, deleteUser, register, logout } = useAuth();
    const { users } = useData();
    const [modalUser, setModalUser] = useState<User | null | 'new'>(null);

    const isAdmin = currentUser?.role === UserRole.Admin;

    const handleSaveUser = async (userData: any, userId?: string, oldPassword?: string) => {
        if (userId) { // Editing existing user
            const { password_do_not_use, ...data } = userData;
            await updateUser(userId, data, oldPassword);
        } else { // Adding new user
            await register(userData);
            // In a real app, you might want to refetch users or add the new user to state
            // to avoid a full page reload. For now, we rely on AppProvider's data fetching.
            // A page reload or re-fetch of data will be needed to see the new user.
        }
    };

    const handleDeleteUser = (userId: string, userName: string) => {
        if (window.confirm(`Are you sure you want to delete the user "${userName}"? This action cannot be undone.`)) {
            deleteUser(userId);
        }
    };

    return (
        <div className="space-y-8">
            {/* My Profile Section for all users */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">My Profile</h2>
                <div className="space-y-2 text-gray-700">
                    <p><strong>Name:</strong> {currentUser?.name}</p>
                    <p><strong>Email:</strong> {currentUser?.email}</p>
                    <p><strong>Phone:</strong> {currentUser?.phone}</p>
                    <p><strong>Role:</strong> {currentUser?.role}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <button onClick={() => setModalUser(currentUser)} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md text-sm">
                        Edit My Profile & Password
                    </button>
                    <button onClick={logout} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm">
                        <LogOutIcon className="w-4 h-4" />
                        <span>Log Out</span>
                    </button>
                </div>
            </div>

            {/* Admin-only User Management Section */}
            {isAdmin && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Manage Users</h2>
                        <button onClick={() => setModalUser('new')} className="flex items-center gap-2 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">
                            <PlusCircleIcon className="w-5 h-5" />
                            Add User
                        </button>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-500 md:hidden">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                            <div className="text-sm text-gray-900">{user.email}</div>
                                            <div className="text-sm text-gray-500">{user.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{user.role}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button onClick={() => setModalUser(user)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                            {currentUser?.id !== user.id && (
                                                <button onClick={() => handleDeleteUser(user.id, user.name)} className="text-red-600 hover:text-red-900">Delete</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modalUser && (
                <UserFormModal 
                    userToEdit={modalUser === 'new' ? null : modalUser}
                    onClose={() => setModalUser(null)}
                    onSave={handleSaveUser}
                    existingUsers={users}
                />
            )}
        </div>
    );
};

export default Users;