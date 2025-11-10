import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { 
    NonoBookIcon, 
    MenuIcon,
    UsersIcon,
    DollarSignIcon,
    PaletteIcon,
    PrinterIcon,
    TruckIcon,
    LogOutIcon
} from '../ui/Icons';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const { currentUser, logout } = useAuth();

    const roleIcons: { [key in UserRole]?: React.FC<any> } = {
        [UserRole.Admin]: UsersIcon,
        [UserRole.Sales]: DollarSignIcon,
        [UserRole.Designer]: PaletteIcon,
        [UserRole.Printer]: PrinterIcon,
        [UserRole.Shipping]: TruckIcon,
    };

    const RoleIcon = currentUser ? roleIcons[currentUser.role] : null;

    return (
        <header className="flex items-center justify-between p-3 bg-white text-gray-800 shadow-sm sticky top-0 z-10 border-b border-gray-200">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-md hover:bg-gray-100 md:hidden"
                    aria-label="Open menu"
                >
                    <MenuIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2">
                    <NonoBookIcon className="h-8 w-8 text-blue-600" />
                    <span className="font-bold text-lg hidden sm:inline">Nono Book Team</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {currentUser && (
                    <>
                        <div className="flex items-center gap-2 text-gray-600" title={`Logged in as ${currentUser.role}`}>
                            {RoleIcon && <RoleIcon className="w-5 h-5" />}
                            <span className="font-medium text-sm">{currentUser.name}</span>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 font-semibold transition-colors p-2 rounded-md hover:bg-red-50"
                            aria-label="Logout"
                        >
                            <LogOutIcon className="w-5 h-5" />
                            <span className="hidden md:inline">Logout</span>
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;