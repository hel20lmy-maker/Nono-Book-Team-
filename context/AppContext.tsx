
import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { User, Order, Printer, ShippingCompany, Payment, UserRole, HoursLog, Bonus, ActivityLogEntry } from '../types';
import { USERS, ORDERS, PRINTERS, SHIPPING_COMPANIES, PAYMENTS, STORY_PRICE, HOURS_LOGS, BONUSES } from '../constants';

// Helper to rehydrate dates from JSON
const rehydrateState = (state: AppState) => {
    return {
        ...state,
        orders: state.orders.map(order => ({
            ...order,
            createdAt: new Date(order.createdAt),
            deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : undefined,
            activityLog: order.activityLog.map(log => ({
                ...log,
                timestamp: new Date(log.timestamp)
            })),
            internationalShippingInfo: order.internationalShippingInfo ? {
                ...order.internationalShippingInfo,
                date: new Date(order.internationalShippingInfo.date)
            } : undefined,
             domesticShippingInfo: order.domesticShippingInfo ? {
                ...order.domesticShippingInfo,
                date: new Date(order.domesticShippingInfo.date)
            } : undefined,
        })),
        payments: state.payments.map(p => ({ ...p, date: new Date(p.date) })),
        hoursLogs: state.hoursLogs.map(h => ({ ...h, date: new Date(h.date) })),
        bonuses: state.bonuses.map(b => ({ ...b, date: new Date(b.date) })),
    };
};

const APP_STATE_KEY = 'nonoBookTeamAppState';

interface AppState {
  loading: boolean;
  currentUser: User | null;
  users: User[];
  orders: Order[];
  printers: Printer[];
  shippingCompanies: ShippingCompany[];
  payments: Payment[];
  hoursLogs: HoursLog[];
  bonuses: Bonus[];
  storyPrice: number;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string } // payload is userId
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'DELETE_ORDER'; payload: string } // payload is orderId
  | { type: 'INITIALIZE_STATE'; payload: AppState }
  | { type: 'ADD_HOURS_LOG'; payload: HoursLog }
  | { type: 'ADD_BONUS'; payload: Bonus }
  | { type: 'ADD_PAYMENT'; payload: Payment }
  | { type: 'UPDATE_USER_RATE'; payload: { userId: string; newRate: number } }
  | { type: 'UPDATE_USER_STORY_RATE'; payload: { userId: string; newRate: number } }
  | { type: 'UPDATE_PRINTER_STORY_RATE'; payload: { printerId: string; newRate: number } };


const initialState: AppState = {
  loading: true,
  currentUser: null,
  users: USERS,
  orders: ORDERS,
  printers: PRINTERS,
  shippingCompanies: SHIPPING_COMPANIES,
  payments: PAYMENTS,
  hoursLogs: HOURS_LOGS,
  bonuses: BONUSES,
  storyPrice: STORY_PRICE,
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'INITIALIZE_STATE':
        return { ...action.payload, loading: false };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
        return {
            ...state,
            users: state.users.map(u => u.id === action.payload.id ? action.payload : u),
            currentUser: state.currentUser?.id === action.payload.id ? action.payload : state.currentUser,
        };
    case 'DELETE_USER':
        if (state.currentUser?.id === action.payload) {
            alert("You cannot delete your own account while logged in.");
            return state;
        }
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

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(APP_STATE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Ensure new state properties exist
        if (!parsedState.hoursLogs) parsedState.hoursLogs = HOURS_LOGS;
        if (!parsedState.bonuses) parsedState.bonuses = BONUSES;
        dispatch({ type: 'INITIALIZE_STATE', payload: rehydrateState(parsedState) });
      } else {
        // First time load, use mock data and set loading to false
        dispatch({ type: 'INITIALIZE_STATE', payload: rehydrateState(initialState) });
      }
    } catch (error) {
      console.error("Could not load state from localStorage", error);
      dispatch({ type: 'INITIALIZE_STATE', payload: rehydrateState(initialState) });
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    // Don't save initial loading state
    if (!state.loading) {
        try {
            // Create a serializable state without large base64 data to avoid quota issues.
            const stateToSave = {
                ...state,
                orders: state.orders.map(order => {
                    // Create a shallow copy of the order to modify
                    const orderToSave: Order = { ...order };

                    // Strip out large base64 strings before saving to localStorage.
                    // This data will not persist on page refresh in this mock setup.
                    orderToSave.referenceImages = [];
                    orderToSave.coverImage = undefined;
                    orderToSave.finalPdf = undefined;
                    
                    // Also strip file data from activity logs
                    orderToSave.activityLog = order.activityLog.map(log => {
                        if (log.file) {
                            const { file, ...restOfLog } = log;
                            return restOfLog as ActivityLogEntry;
                        }
                        return log;
                    });

                    return orderToSave;
                }),
            };
            localStorage.setItem(APP_STATE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Could not save state to localStorage", error);
        }
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};