
import React, { useState, useContext } from 'react';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';
import { AppContext } from './context/AppContext';
import { User } from './types';

type AuthView = 'login' | 'register';

const DatabaseSetupErrorComponent: React.FC = () => {
    const sqlToRun = `-- This script sets up and patches the database schema for the Nono Book Team app.
-- It is idempotent and can be run safely multiple times to apply updates.
-- VERSION 2.4: Fixes RLS policies for order cancellation and deletion.

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
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to_designer UUID REFERENCES public.users(id) ON DELETE SET NULL,
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


-- STEP 1.5: Grant table permissions to authenticated role
-- =========================================================
-- These grants allow logged-in users to perform actions,
-- which are then restricted by the Row Level Security policies below.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.printers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hours_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bonuses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;


-- STEP 2: Set up Row Level Security (RLS)
-- =============================================

-- Secure function to check for an Admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public
AS $$ SELECT (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'Admin' $$;

-- Enable RLS and create/replace policies for all tables
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

-- Orders RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their relevant orders" ON public.orders;
DROP POLICY IF EXISTS "Sales can create new orders" ON public.orders;
DROP POLICY IF EXISTS "Creators can delete new orders" ON public.orders;
DROP POLICY IF EXISTS "Creators can update their non-finalized orders" ON public.orders;
DROP POLICY IF EXISTS "Creators can delete their new or cancelled orders" ON public.orders;

CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (is_admin());
CREATE POLICY "Users can view their relevant orders" ON public.orders FOR SELECT USING (auth.uid() = created_by OR auth.uid() = assigned_to_designer);
CREATE POLICY "Sales can create new orders" ON public.orders FOR INSERT WITH CHECK ((auth.jwt()->>'user_metadata')::jsonb->>'role' = 'Sales' AND auth.uid() = created_by);

-- FIX: Allow creators to UPDATE their orders (e.g., to cancel them) as long as they have not been delivered.
CREATE POLICY "Creators can update their non-finalized orders" ON public.orders FOR UPDATE
USING (auth.uid() = created_by AND status <> 'Delivered');

-- FIX: Allow creators to DELETE orders they created if they are in a pre-production state or already cancelled.
CREATE POLICY "Creators can delete their new or cancelled orders" ON public.orders FOR DELETE
USING (auth.uid() = created_by AND status IN ('New Order', 'Cancelled'));

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

-- Drop old role-update function if it exists
DROP FUNCTION IF EXISTS public.update_auth_user_role(uuid, text);

-- Function for admins to update other users' details (name, phone, role)
CREATE OR REPLACE FUNCTION public.update_user_details_by_admin(user_id_to_update uuid, new_name TEXT, new_phone TEXT, new_role TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: Only admins can update user details.';
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || 
    jsonb_build_object(
      'name', new_name,
      'phone', new_phone,
      'role', new_role
    )
  WHERE id = user_id_to_update;
  RETURN 'User details updated successfully.';
END;
$$;


-- Function to copy new user data and make the first user an admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
  new_user_role TEXT;
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 0 THEN
    new_user_role := 'Admin';
    UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', 'Admin') WHERE id = NEW.id;
  ELSE
    new_user_role := NEW.raw_user_meta_data->>'role';
  END IF;
  INSERT INTO public.users (id, name, email, phone, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, NEW.raw_user_meta_data->>'phone', new_user_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to sync user updates from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    name = NEW.raw_user_meta_data->>'name',
    phone = NEW.raw_user_meta_data->>'phone',
    role = NEW.raw_user_meta_data->>'role',
    email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the sync function on user update
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();


-- Secure function to completely delete a user (auth and public profile)
CREATE OR REPLACE FUNCTION public.delete_user_by_id(user_id_to_delete uuid)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  RETURN 'User successfully deleted.';
END;
$$;


-- STEP 4: Apply Schema patches
-- =============================================
-- This part modifies existing structures and should be run after they are created.

-- Foreign Key constraints on 'orders' table to allow user deletion.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_created_by_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_assigned_to_designer_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_assigned_to_designer_fkey FOREIGN KEY (assigned_to_designer) REFERENCES public.users(id) ON DELETE SET NULL;


-- STEP 5: Grant Function Permissions
-- =============================================
GRANT EXECUTE ON FUNCTION public.delete_user_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_details_by_admin(uuid, text, text, text) TO authenticated;


-- STEP 6: Create Storage Policies for 'order-files' bucket
-- ==============================================================

-- Policy: Admins can do anything in the storage bucket.
DROP POLICY IF EXISTS "Allow admin full access to order files" ON storage.objects;
CREATE POLICY "Allow admin full access to order files"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'order-files' AND is_admin() );

-- Policy: Allow authenticated users to view any file (as bucket is public).
DROP POLICY IF EXISTS "Allow authenticated read access to order files" ON storage.objects;
CREATE POLICY "Allow authenticated read access to order files"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'order-files' );

-- Policy: Allow users to upload/delete files for orders they have access to.
DROP POLICY IF EXISTS "Allow authorized users to manage their order files" ON storage.objects;
CREATE POLICY "Allow authorized users to manage their order files"
ON storage.objects FOR ALL -- Covers INSERT, UPDATE, DELETE
TO authenticated
USING (
  bucket_id = 'order-files' AND
  (
    -- Check if the user is the creator or assigned designer of the order
    -- The order ID is extracted from the file path, e.g., "public/ORDER_ID/file.jpg"
    auth.uid() IN (
      SELECT created_by FROM public.orders WHERE id = (storage.foldername(name))[2]::uuid
      UNION
      SELECT assigned_to_designer FROM public.orders WHERE id = (storage.foldername(name))[2]::uuid
    )
  )
)
WITH CHECK (
  bucket_id = 'order-files' AND
  (
    -- Same check for inserts
    auth.uid() IN (
      SELECT created_by FROM public.orders WHERE id = (storage.foldername(name))[2]::uuid
      UNION
      SELECT assigned_to_designer FROM public.orders WHERE id = (storage.foldername(name))[2]::uuid
    )
  )
);
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

const NoAdminErrorComponent: React.FC<{ users: User[] }> = ({ users }) => {
    const [selectedEmail, setSelectedEmail] = useState('');
    const [copiedScript, setCopiedScript] = useState<'script1' | 'script2' | null>(null);

    const script1 = `CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  IF target_user_id IS NULL THEN RETURN 'User not found.'; END IF;
  UPDATE public.users SET role = 'Admin' WHERE id = target_user_id;
  UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "Admin"}'::jsonb WHERE id = target_user_id;
  RETURN 'User ' || user_email || ' promoted to Admin.';
END;
$$;`;
    const script2 = `SELECT promote_user_to_admin('${selectedEmail || 'user@example.com'}');`;

    const handleCopy = (script: string, scriptId: 'script1' | 'script2') => {
        navigator.clipboard.writeText(script).then(() => {
            setCopiedScript(scriptId);
            setTimeout(() => setCopiedScript(null), 2000);
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-gray-800 p-8 rounded-lg shadow-2xl">
                <h1 className="text-3xl font-bold text-yellow-400 mb-4">Admin Account Required</h1>
                <p className="text-lg mb-6">The application has users, but no one has the 'Admin' role. To proceed, please promote one of the existing users to an administrator.</p>
                <div className="text-left bg-gray-900 p-4 rounded-md">
                    <div className="mb-4">
                        <label className="block text-lg font-semibold mb-2">1. Select a user to promote:</label>
                        <select
                            value={selectedEmail}
                            onChange={(e) => setSelectedEmail(e.target.value)}
                            className="w-full p-2 rounded-md bg-gray-700 text-white border-gray-600"
                        >
                            <option value="" disabled>-- Choose a user --</option>
                            {users.map(user => (
                                <option key={user.id} value={user.email}>{user.name} ({user.email})</option>
                            ))}
                        </select>
                    </div>

                    <p className="font-semibold mt-6 mb-2">2. Run the following SQL queries in your Supabase SQL Editor:</p>
                    <div className="space-y-4">
                         <div>
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-md font-semibold text-gray-300">Script A: Create the Promotion Function (Run once)</h3>
                                <button onClick={() => handleCopy(script1, 'script1')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm">
                                    {copiedScript === 'script1' ? 'Copied!' : 'Copy SQL'}
                                </button>
                            </div>
                            <pre className="bg-black p-3 rounded-md text-sm overflow-auto max-h-48 text-yellow-300"><code>{script1}</code></pre>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-md font-semibold text-gray-300">Script B: Promote the Selected User</h3>
                                <button onClick={() => handleCopy(script2, 'script2')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm" disabled={!selectedEmail}>
                                    {copiedScript === 'script2' ? 'Copied!' : 'Copy SQL'}
                                </button>
                            </div>
                            <pre className={`bg-black p-3 rounded-md text-sm overflow-auto text-yellow-300 ${!selectedEmail ? 'opacity-50' : ''}`}><code>{script2}</code></pre>
                        </div>
                    </div>
                    <p className="text-sm mt-4">After running both scripts successfully, please refresh this application page.</p>
                </div>
            </div>
        </div>
    );
};


function App() {
  const { state } = useContext(AppContext);
  const { currentUser, loading, dbError, users } = useAuth();
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
          case 'NO_ADMIN_FOUND':
              return <NoAdminErrorComponent users={state.users} />;
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
