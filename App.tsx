
import React, { useState } from 'react';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';

type AuthView = 'login' | 'register';

const DatabaseSetupErrorComponent: React.FC = () => {
    const sqlToRun = `-- This script sets up the entire database schema for the Nono Book Team app.
-- It is idempotent, meaning it can be run multiple times without causing errors.

-- STEP 1: Create all required tables if they don't exist
-- ========================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, email TEXT, phone TEXT, role TEXT, hourly_rate NUMERIC, story_rate NUMERIC
);
COMMENT ON TABLE public.users IS 'Public user profiles, linked to auth.users.';

CREATE TABLE IF NOT EXISTS public.printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, story_rate NUMERIC
);
COMMENT ON TABLE public.printers IS 'List of available printing companies.';

CREATE TABLE IF NOT EXISTS public.shipping_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('International', 'Domestic'))
);
COMMENT ON TABLE public.shipping_companies IS 'List of available shipping companies.';

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), status TEXT NOT NULL, customer JSONB NOT NULL, story JSONB NOT NULL, price NUMERIC NOT NULL,
  reference_images JSONB, final_pdf JSONB, cover_image JSONB, created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id), assigned_to_designer UUID REFERENCES public.users(id),
  assigned_to_printer UUID REFERENCES public.printers(id), international_shipping_info JSONB,
  domestic_shipping_info JSONB, delivery_date TIMESTAMPTZ, activity_log JSONB
);
COMMENT ON TABLE public.orders IS 'Core table for managing all customer orders.';

CREATE TABLE IF NOT EXISTS public.hours_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hours NUMERIC NOT NULL, rate NUMERIC NOT NULL, date TIMESTAMPTZ NOT NULL
);
COMMENT ON TABLE public.hours_logs IS 'Tracks billable hours for sales staff.';

CREATE TABLE IF NOT EXISTS public.bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL, date TIMESTAMPTZ NOT NULL, notes TEXT
);
COMMENT ON TABLE public.bonuses IS 'Records bonuses given to employees.';

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  printer_id UUID REFERENCES public.printers(id) ON DELETE CASCADE, amount NUMERIC NOT NULL,
  date TIMESTAMPTZ NOT NULL, notes TEXT
);
COMMENT ON TABLE public.payments IS 'Tracks payments made to employees and printers.';


-- STEP 2: Set up Row Level Security (RLS)
-- =============================================

-- Secure function to check for an Admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public
AS $$ SELECT (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'Admin' $$;

-- Enable RLS and create/replace policies for all tables
-- The DROP...CREATE pattern makes the script re-runnable.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.users;
CREATE POLICY "Allow authenticated read access" ON public.users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow individual update access" ON public.users;
CREATE POLICY "Allow individual update access" ON public.users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Allow admin full access" ON public.users;
CREATE POLICY "Allow admin full access" ON public.users FOR ALL USING ( is_admin() );

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read access on printers" ON public.printers;
CREATE POLICY "Allow authenticated read access on printers" ON public.printers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow admin full access on printers" ON public.printers;
CREATE POLICY "Allow admin full access on printers" ON public.printers FOR ALL USING ( is_admin() );

ALTER TABLE public.shipping_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read access on shipping_companies" ON public.shipping_companies;
CREATE POLICY "Allow authenticated read access on shipping_companies" ON public.shipping_companies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow admin full access on shipping_companies" ON public.shipping_companies;
CREATE POLICY "Allow admin full access on shipping_companies" ON public.shipping_companies FOR ALL USING ( is_admin() );

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage orders" ON public.orders;
CREATE POLICY "Allow authenticated users to manage orders" ON public.orders FOR ALL TO authenticated USING (true);

ALTER TABLE public.hours_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to manage their own hours" ON public.hours_logs;
CREATE POLICY "Allow users to manage their own hours" ON public.hours_logs FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow admin full access on hours_logs" ON public.hours_logs;
CREATE POLICY "Allow admin full access on hours_logs" ON public.hours_logs FOR ALL USING ( is_admin() );

ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to see their own bonuses" ON public.bonuses;
CREATE POLICY "Allow users to see their own bonuses" ON public.bonuses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow admin full access on bonuses" ON public.bonuses;
CREATE POLICY "Allow admin full access on bonuses" ON public.bonuses FOR ALL USING ( is_admin() );

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to see their own payments" ON public.payments;
CREATE POLICY "Allow users to see their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow admin full access on payments" ON public.payments;
CREATE POLICY "Allow admin full access on payments" ON public.payments FOR ALL USING ( is_admin() );


-- STEP 3: Create Functions and Triggers
-- =============================================

-- Function to copy new user data from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'role');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- That's it for the SQL!
-- Remember to also create the Storage Bucket as described in the app.
`;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlToRun).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-gray-800 p-8 rounded-lg shadow-2xl">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Database Setup Required</h1>
                <p className="text-lg mb-6">The application failed to load data because some database tables are missing. This usually happens on the first run. Please run the script below to create the entire database schema.</p>
                <div className="text-left bg-gray-900 p-4 rounded-md">
                    <p className="font-semibold">Please follow these steps to resolve the issue:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-2">
                        <li>Go to your Supabase project dashboard.</li>
                        <li>Navigate to the <span className="font-semibold">SQL Editor</span> page.</li>
                        <li>Click <span className="font-semibold">+ New query</span>.</li>
                        <li>Click the <span className="font-semibold">'Copy SQL'</span> button below, then paste the script into the editor.</li>
                        <li>Click <span className="font-semibold">RUN</span> to execute the script.</li>
                        <li>After it succeeds, go to the <span className="font-semibold">Storage</span> page from the left menu.</li>
                        <li>Click <span className="font-semibold">Create a new bucket</span>.</li>
                        <li>Enter <code className="bg-yellow-400 text-black px-1.5 py-0.5 rounded">order-files</code> as the bucket name and toggle <span className="font-semibold">Public bucket</span> ON. Click <span className="font-semibold">Create bucket</span>.</li>
                        <li>Finally, refresh this application page.</li>
                    </ol>
                </div>
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold">SQL Script to Run:</h3>
                        <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm">
                            {copied ? 'Copied!' : 'Copy SQL'}
                        </button>
                    </div>
                    <pre className="bg-gray-900 p-4 rounded-md text-sm overflow-auto max-h-64 text-yellow-300">
                        <code>{sqlToRun}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
};

const RlsRecursionErrorComponent: React.FC = () => {
    const sqlToRun = `-- This script fixes a bug in the admin security policy that causes an "infinite recursion" error
-- by replacing the faulty direct table query with a secure, elevated-privilege function.

-- 1. Create a secure function to check for an Admin role.
-- This function runs with elevated privileges to safely check the user's role from auth data.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'Admin'
$$;

-- 2. Drop the faulty policy that causes infinite recursion.
DROP POLICY IF EXISTS "Allow admin full access" ON public.users;

-- 3. Recreate the policy to use the new, safe function.
CREATE POLICY "Allow admin full access" ON public.users FOR ALL
USING ( is_admin() );
`;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlToRun).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-gray-800 p-8 rounded-lg shadow-2xl">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Database Policy Error Detected</h1>
                <p className="text-lg mb-6">A misconfiguration in a database security policy is causing an "infinite recursion" error, which prevents data from loading. This can be fixed by running the short SQL script below.</p>
                 <div className="text-left bg-gray-900 p-4 rounded-md">
                    <p className="font-semibold">Please follow these steps to resolve the issue:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-2">
                        <li>Go to your Supabase project dashboard.</li>
                        <li>Navigate to the <span className="font-semibold">SQL Editor</span> page.</li>
                        <li>Click <span className="font-semibold">+ New query</span>.</li>
                        <li>Click the <span className="font-semibold">'Copy SQL'</span> button below, then paste the script into the editor.</li>
                        <li>Click <span className="font-semibold">RUN</span> to execute the script.</li>
                        <li>Once it completes successfully, refresh this application page.</li>
                    </ol>
                </div>
                 <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold">SQL Script to Run:</h3>
                        <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm">
                            {copied ? 'Copied!' : 'Copy SQL'}
                        </button>
                    </div>
                    <pre className="bg-gray-900 p-4 rounded-md text-sm overflow-auto max-h-64 text-yellow-300">
                        <code>{sqlToRun}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
};

const PermissionDeniedErrorComponent: React.FC = () => {
    const sqlToRun = `-- This script fixes multiple potential Row Level Security (RLS) issues
-- on the 'public.users' table that can cause "permission denied" errors,
-- especially for admin users.

-- FIX 1: Create a secure function to check for an Admin role.
-- Policies cannot directly query the 'auth.users' table because users lack permission.
-- This function runs with elevated privileges ('security definer') to safely check the role.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'Admin'
$$;

-- FIX 2: Replace the faulty admin policy with one that uses the new function.
-- This prevents permission errors when an admin tries to access the user list.
DROP POLICY IF EXISTS "Allow admin full access" ON public.users;
CREATE POLICY "Allow admin full access" ON public.users FOR ALL
USING ( is_admin() );

-- FIX 3: Ensure all authenticated users can read the user list.
-- This is necessary for non-admin users to see user names in dropdowns, etc.
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.users;
CREATE POLICY "Allow authenticated read access" ON public.users FOR SELECT
TO authenticated
USING (true);

-- Also ensure the basic table-level permission is granted.
GRANT SELECT ON TABLE public.users TO authenticated;`;

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlToRun).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-gray-800 p-8 rounded-lg shadow-2xl">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Database Permission Error</h1>
                <p className="text-lg mb-6">The application can't load user data due to a "permission denied" error. This is likely caused by an incorrect database security policy (RLS) on the <code className="bg-yellow-400 text-black px-2 py-1 rounded">users</code> table.</p>
                 <div className="text-left bg-gray-900 p-4 rounded-md">
                    <p className="font-semibold">To fix this, please run the following SQL script in your Supabase project's SQL Editor:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-2">
                        <li>Navigate to the <span className="font-semibold">SQL Editor</span> page.</li>
                        <li>Click the <span className="font-semibold">'Copy SQL'</span> button below to copy the script.</li>
                        <li>Paste the script into a new query.</li>
                        <li>Click <span className="font-semibold">RUN</span>.</li>
                        <li>After it succeeds, refresh this application page.</li>
                    </ol>
                </div>
                 <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold">SQL Script to Run:</h3>
                        <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm">
                            {copied ? 'Copied!' : 'Copy SQL'}
                        </button>
                    </div>
                    <pre className="bg-gray-900 p-4 rounded-md text-sm overflow-auto max-h-64 text-yellow-300">
                        <code>{sqlToRun}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
};


function App() {
  const { currentUser, loading, dbError } = useAuth();
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
  
  if (dbError) {
      switch(dbError) {
          case 'DB_SETUP_INCOMPLETE':
              return <DatabaseSetupErrorComponent />;
          case 'INFINITE_RECURSION':
              return <RlsRecursionErrorComponent />;
          case 'PERMISSION_DENIED':
              return <PermissionDeniedErrorComponent />;
          default:
              return <div>An unknown database error occurred: {dbError}</div>;
      }
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
