
import React, { useState } from 'react';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';

type AuthView = 'login' | 'register';

function App() {
  const { currentUser, loading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');

  if (!supabase) {
      return (
          <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-lg shadow-2xl text-center">
                  <h1 className="text-3xl font-bold text-red-500 mb-4">Configuration Needed</h1>
                  <p className="text-lg mb-6">Your Supabase credentials are not set. The application cannot connect to the backend.</p>
                  <div className="text-left bg-gray-900 p-4 rounded-md">
                      <p className="font-semibold">Please follow these steps:</p>
                      <ol className="list-decimal list-inside mt-2 space-y-2">
                          <li>Open the file <code className="bg-yellow-400 text-black px-2 py-1 rounded">lib/supabaseClient.ts</code> in your code editor.</li>
                          <li>Replace the placeholder values for <code className="bg-yellow-400 text-black px-2 py-1 rounded">supabaseUrl</code> and <code className="bg-yellow-400 text-black px-2 py-1 rounded">supabaseAnonKey</code> with your actual Supabase project credentials.</li>
                           <li>You can find these keys in your Supabase project dashboard under <span className="font-semibold">Settings &gt; API</span>.</li>
                          <li>Save the file. The application will automatically reload.</li>
                      </ol>
                  </div>
              </div>
          </div>
      );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Nono Book Team</h1>
            <p className="text-gray-600">Your Children's Story Workflow Manager</p>
          </div>
          {authView === 'login' ? (
            <Login onSwitchToRegister={() => setAuthView('register')} />
          ) : (
            <Register onSwitchToLogin={() => setAuthView('login')} />
          )}
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

export default App;
