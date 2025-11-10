
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { HomeIcon, BriefcaseIcon, BarChartIcon, DollarSignIcon, UsersIcon } from '../ui/Icons';

interface BottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, setActiveView }) => {
    const { currentUser } = useAuth();

    const navItems = [
        { name: 'Dashboard', view: 'dashboard', icon: HomeIcon, roles: [UserRole.Admin, UserRole.Sales, UserRole.Designer, UserRole.Printer, UserRole.Shipping] },
        { name: 'Workflow', view: 'workflow', icon: BriefcaseIcon, roles: [UserRole.Admin] },
        { name: 'Reports', view: 'reports', icon: BarChartIcon, roles: [UserRole.Admin, UserRole.Sales, UserRole.Designer, UserRole.Printer] },
        { name: 'Accounts', view: 'accounts', icon: DollarSignIcon, roles: [UserRole.Admin, UserRole.Sales, UserRole.Designer, UserRole.Printer] },
        { name: 'Users', view: 'users', icon: UsersIcon, roles: [UserRole.Admin, UserRole.Sales, UserRole.Designer, UserRole.Printer, UserRole.Shipping] },
    ];
    
    // In mobile view, 'workflow' is the same as 'dashboard' for non-admins, so let's consolidate.
    const getMobileViewName = (name: string) => {
        if (currentUser?.role !== UserRole.Admin && name === 'Workflow') {
            return 'dashboard';
        }
        return name.toLowerCase();
    }

    const NavLink: React.FC<{ name: string; view: string; icon: React.FC<any> }> = ({ name, view, icon: Icon }) => {
        const mobileView = getMobileViewName(view);
        const isActive = activeView === mobileView;
        return (
            <button
                onClick={() => setActiveView(mobileView)}
                className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors ${
                    isActive ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
                }`}
            >
                <Icon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">{name}</span>
            </button>
        );
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around z-10">
            {navItems.filter(item => item.roles.includes(currentUser!.role)).map(item => (
                <NavLink key={item.name} name={item.name} view={item.view} icon={item.icon} />
            ))}
        </nav>
    );
}

export default BottomNav;