
import React, { useState } from 'react';
import Sidebar from '../layout/Sidebar';
import Header from '../layout/Header';
import BottomNav from '../layout/BottomNav';
import Workflow from '../workflow/Workflow';
import Reports from '../reports/Reports';
import Accounts from '../accounts/Accounts';
import Users from '../users/Users';
import DashboardSummary from './DashboardSummary';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';

const Dashboard: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const { currentUser } = useAuth();

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        // Admin sees a summary, others see their workflow directly.
        return currentUser?.role === UserRole.Admin ? <DashboardSummary /> : <Workflow />;
      case 'workflow':
        return <Workflow />;
      case 'reports':
        return <Reports />;
      case 'accounts':
        return <Accounts />;
      case 'users':
        return <Users />;
      default:
        return currentUser?.role === UserRole.Admin ? <DashboardSummary /> : <Workflow />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Mobile sidebar panel */}
      <div 
        className={`fixed top-0 left-0 h-full z-40 transform transition-transform md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar 
            activeView={activeView} 
            setActiveView={(view) => {
                setActiveView(view);
                setSidebarOpen(false); // Close sidebar on nav
            }} 
        />
      </div>

      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 bg-gray-50 overflow-auto pb-20 md:pb-6">
          {renderActiveView()}
        </main>
        <BottomNav activeView={activeView} setActiveView={setActiveView} />
      </div>
    </div>
  );
};

export default Dashboard;
