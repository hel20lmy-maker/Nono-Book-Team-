
import React, { useState } from 'react';
import Sidebar from '../layout/Sidebar';
import Header from '../layout/Header';
import Home from './Home';

const Dashboard: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // In a real app, this state would navigate between pages.
  // For this UI clone, we'll keep it simple and static.
  const [activeView, setActiveView] = useState('dashboard');

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
        <main className="flex-1 p-4 md:p-6 bg-gray-50 overflow-auto">
          <Home />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
