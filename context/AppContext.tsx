
import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { User, Order, Printer, ShippingCompany, Payment, UserRole, HoursLog, Bonus, ActivityLogEntry } from '../types';
import { STORY_PRICE } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { mapToCamelCase } from '../lib/utils';
import { Session } from '@supabase/supabase-js';

// Helper to rehydrate dates from Supabase (which returns strings)
// This version is more defensive to prevent crashes on null/incomplete data.
const rehydrateState = (state: any): AppState => {
    const camelState = mapToCamelCase(state);
    return {
        ...camelState,
        orders: (camelState.orders || []).filter(Boolean).map((order: any) => ({
            ...order,
            createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
            deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : undefined,
            activityLog: (order.activityLog || []).filter(Boolean).map((log: any) => ({
                ...log,
                timestamp: log.timestamp ? new Date(log.timestamp) : new Date()
            })),
            internationalShippingInfo: order.internationalShippingInfo && order.internationalShippingInfo.date ? {
                ...order.internationalShippingInfo,
                date: new Date(order.internationalShippingInfo.date)
            } : undefined,
             domesticShippingInfo: order.domesticShippingInfo && order.domesticShippingInfo.date ? {
                ...order.domesticShippingInfo,
                date: new Date(order.domesticShippingInfo.date)
            } : undefined,
        })),
        payments: (camelState.payments || []).filter(Boolean).map((p: any) => ({ ...p, date: p.date ? new Date(p.date) : new Date() })),
        hoursLogs: (camelState.hoursLogs || []).filter(Boolean).map((h: any) => ({ ...h, date: h.date ? new Date(h.date) : new Date() })),
        bonuses: (camelState.bonuses || []).filter(Boolean).map((b: any) => ({ ...b, date: b.date ? new Date(b.date) : new Date() })),
    };
};

interface AppState {
  loading: boolean;
  dbError: string | null;
  currentUser: User | null;
  users: User[];
  orders: Order[];
  printers: Printer[];
  shippingCompanies: ShippingCompany[];
  payments: Payment[];
  hoursLogs: HoursLog[];
  bonuses: Bonus[];
  storyPrice: number;
  searchQuery: string;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DB_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string } // payload is userId
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'DELETE_ORDER'; payload: string } // payload is orderId
  | { type: 'INITIALIZE_STATE'; payload: Partial<Omit<AppState, 'loading' | 'currentUser' | 'dbError'>> }
  | { type: 'ADD_HOURS_LOG'; payload: HoursLog }
  | { type: 'ADD_BONUS'; payload: Bonus }
  | { type: 'ADD_PAYMENT'; payload: Payment }
  | { type: 'UPDATE_USER_RATE'; payload: { userId: string; newRate: number } }
  | { type: 'UPDATE_USER_STORY_RATE'; payload: { userId: string; newRate: number } }
  | { type: 'UPDATE_PRINTER_STORY_RATE'; payload: { printerId: string; newRate: number } }
  | { type: 'SET_SEARCH_QUERY'; payload: string };


const initialState: AppState = {
  loading: true,
  dbError: null,
  currentUser: null,
  users: [],
  orders: [],
  printers: [],
  shippingCompanies: [],
  payments: [],
  hoursLogs: [],
  bonuses: [],
  storyPrice: STORY_PRICE,
  searchQuery: '',
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_DB_ERROR':
      return { ...state, dbError: action.payload };
    case 'INITIALIZE_STATE':
        return { ...state, ...rehydrateState(action.payload), loading: false };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'ADD_USER':
      // This is for real-time updates if we were to subscribe
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
        return {
            ...state,
            users: state.users.map(u => u.id === action.payload.id ? action.payload : u),
            currentUser: state.currentUser?.id === action.payload.id ? action.payload : state.currentUser,
        };
    case 'DELETE_USER':
        return {
            ...state,
            users: state.users.filter(u => u.id !== action.payload),
        };
    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...state.orders] };
    case 'UPDATE_ORDER':
      return { ...state, orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o) };
    case 'DELETE_ORDER':
        return { ...state, orders: state.orders.filter(o => o.id !== action.payload) };
    case 'ADD_HOURS_LOG':
      return { ...state, hoursLogs: [...state.hoursLogs, action.payload] };
    case 'ADD_BONUS':
      return { ...state, bonuses: [...state.bonuses, action.payload] };
    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, action.payload] };
    case 'UPDATE_USER_RATE':
      return {
        ...state,
        users: state.users.map(u =>
          u.id === action.payload.userId
            ? { ...u, hourlyRate: action.payload.newRate }
            : u
        ),
      };
    case 'UPDATE_USER_STORY_RATE':
        return {
            ...state,
            users: state.users.map(u =>
                u.id === action.payload.userId
                ? { ...u, storyRate: action.payload.newRate }
                : u
            ),
        };
    case 'UPDATE_PRINTER_STORY_RATE':
        return {
            ...state,
            printers: state.printers.map(p =>
                p.id === action.payload.printerId
                ? { ...p, storyRate: action.payload.newRate }
                : p
            ),
        };
    case 'SET_SEARCH_QUERY':
        return { ...state, searchQuery: action.payload };
    default:
      return state;
  }
};

export const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    if (!supabase) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    const loadDataForSession = async (session: Session) => {
      // 1. Set current user from session
      const userProfile: User = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata.name || 'Unnamed User',
        phone: session.user.user_metadata.phone || '',
        role: session.user.user_metadata.role || UserRole.Sales,
        hourlyRate: session.user.user_metadata.hourlyRate,
        storyRate: session.user.user_metadata.storyRate,
      };
      dispatch({ type: 'SET_CURRENT_USER', payload: userProfile });

      // 2. Load all other app data
      try {
        const [
          usersRes,
          ordersRes,
          printersRes,
          shippingCompaniesRes,
          paymentsRes,
          hoursLogsRes,
          bonusesRes,
        ] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('orders').select('*').order('created_at', { ascending: false }),
          supabase.from('printers').select('*'),
          supabase.from('shipping_companies').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('hours_logs').select('*'),
          supabase.from('bonuses').select('*'),
        ]);

        const responses = { usersRes, ordersRes, printersRes, shippingCompaniesRes, paymentsRes, hoursLogsRes, bonusesRes };
        for (const [key, res] of Object.entries(responses)) {
          if (res.error) throw new Error(`Failed to fetch ${key}: ${res.error.message}`);
        }

        const usersData = usersRes.data || [];
        const hasAdmin = usersData.some(u => mapToCamelCase(u).role === UserRole.Admin);

        if (!hasAdmin && usersData.length > 0) {
            // Special case: users exist but none are admins.
            dispatch({ type: 'INITIALIZE_STATE', payload: { users: usersData } });
            dispatch({ type: 'SET_DB_ERROR', payload: 'NO_ADMIN_FOUND' });
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        const fetchedState = {
          users: usersData,
          orders: ordersRes.data || [],
          printers: printersRes.data || [],
          shippingCompanies: shippingCompaniesRes.data || [],
          payments: paymentsRes.data || [],
          hoursLogs: hoursLogsRes.data || [],
          bonuses: bonusesRes.data || [],
        };

        dispatch({ type: 'INITIALIZE_STATE', payload: fetchedState });
      } catch (error: any) {
        console.error("Could not load state from Supabase", error);
        let errorPayload: string | null = null;
        const errorMessage = error.message || '';

        if (errorMessage.includes('does not exist') || errorMessage.includes('Could not find the table')) {
          errorPayload = 'DB_SETUP_INCOMPLETE';
        } else if (errorMessage.includes('infinite recursion')) {
          errorPayload = 'INFINITE_RECURSION';
        } else if (errorMessage.includes('permission denied for table users')) {
          errorPayload = 'PERMISSION_DENIED';
        } else {
          errorPayload = `Failed to load data from the database. Please check your connection and Supabase configuration. Error: ${errorMessage}`;
        }
        dispatch({ type: 'SET_DB_ERROR', payload: errorPayload });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    const handleAuthChange = async (session: Session | null) => {
      if (session) {
        await loadDataForSession(session);
      } else {
        dispatch({ type: 'SET_CURRENT_USER', payload: null });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    dispatch({ type: 'SET_LOADING', payload: true });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
