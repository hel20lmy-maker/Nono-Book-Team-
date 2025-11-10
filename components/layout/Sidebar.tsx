
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { HomeIcon, BriefcaseIcon, BarChartIcon, DollarSignIcon, UsersIcon, LogOutIcon } from '../ui/Icons';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const { currentUser, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: HomeIcon, roles: [UserRole.Admin, UserRole.Sales, UserRole.Designer, UserRole.Printer, UserRole.Shipping] },
    { name: 'Workflow', icon: BriefcaseIcon, roles: [UserRole.Admin] },
    { name: 'Reports', icon: BarChartIcon, roles: [UserRole.Admin, UserRole.Sales, UserRole.Designer, UserRole.Printer] },
    { name: 'Accounts', icon: DollarSignIcon, roles: [UserRole.Admin, UserRole.Sales, UserRole.Designer, UserRole.Printer] },
    { name: 'Users', icon: UsersIcon, roles: [UserRole.Admin, UserRole.Sales, UserRole.Designer, UserRole.Printer, UserRole.Shipping] },
  ];

  const NavLink: React.FC<{ name: string; icon: React.FC<any> }> = ({ name, icon: Icon }) => {
    const isActive = activeView === name.toLowerCase();
    return (
      <button
        onClick={() => setActiveView(name.toLowerCase())}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
      >
        <Icon className="h-6 w-6" />
        <span className="font-medium">{name}</span>
      </button>
    );
  };

  return (
    <aside className="w-64 bg-gray-800 text-white flex-col h-screen p-4 flex">
      <div className="text-2xl font-bold mb-10 px-2">Nono Book Team</div>
      <nav className="flex-grow space-y-2">
        {navItems.filter(item => item.roles.includes(currentUser!.role)).map(item => (
          <NavLink key={item.name} name={item.name} icon={item.icon} />
        ))}
      </nav>
      <div className="mt-auto">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-red-600 hover:text-white"
        >
          <LogOutIcon className="h-6 w-6" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
