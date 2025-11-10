
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { GithubIcon, SearchIcon, InboxIcon, MenuIcon } from '../ui/Icons';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const { currentUser } = useAuth();

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
                <GithubIcon className="h-8 w-8 text-gray-900" />
                <span className="font-semibold text-lg hidden sm:block">Dashboard</span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    className="p-2 rounded-md hover:bg-gray-100"
                    aria-label="Search"
                >
                    <SearchIcon className="h-5 w-5" />
                </button>
                 <button
                    className="p-2 rounded-md hover:bg-gray-100"
                    aria-label="Inbox"
                >
                    <InboxIcon className="h-5 w-5" />
                </button>
                <button
                    className="h-8 w-8 rounded-full bg-yellow-400 flex items-center justify-center overflow-hidden"
                    aria-label="User profile"
                >
                    {/* Placeholder for user avatar */}
                </button>
            </div>
        </header>
    );
};

export default Header;
