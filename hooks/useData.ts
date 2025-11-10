
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Order, UserRole, OrderStatus, ActivityLogEntry, HoursLog, Bonus, Payment } from '../types';
import { useAuth } from './useAuth';

export const useData = () => {
  const { state, dispatch } = useContext(AppContext);
  const { currentUser } = useAuth();

  const createOrder = (orderData: Omit<Order, 'id' | 'createdAt' | 'activityLog'>) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    const newOrderId = `ORD-${String(Math.floor(Date.now() / 1000)).slice(-6)}`;
    
    const newOrder: Order = {
        ...orderData,
        id: newOrderId,
        createdAt: new Date(),
        activityLog: [{
            user: currentUser.name,
            role: currentUser.role,
            action: 'Created Order',
            timestamp: new Date()
        }]
    };

    dispatch({ type: 'ADD_ORDER', payload: newOrder });
  };
  
  const updateOrderStatus = (order: Order, actionDescription: string, file?: {name: string, url: string}) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    const newActivityLog: ActivityLogEntry = {
        user: currentUser.name,
        role: currentUser.role,
        action: actionDescription,
        timestamp: new Date(),
        file: file,
    }
    const updatedOrder = { ...order, activityLog: [...order.activityLog, newActivityLog] };
    
    dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
  }

  const editOrder = (updatedOrder: Order, actionDescription: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    const newActivityLog: ActivityLogEntry = {
        user: currentUser.name,
        role: currentUser.role,
        action: actionDescription,
        timestamp: new Date(),
    };

    const newOrderState = { ...updatedOrder, activityLog: [...updatedOrder.activityLog, newActivityLog] };
    dispatch({ type: 'UPDATE_ORDER', payload: newOrderState });
  };

  const deleteOrder = (orderId: string) => {
      dispatch({ type: 'DELETE_ORDER', payload: orderId });
  };

  const addHoursLog = (logData: Omit<HoursLog, 'id'>) => {
    const newLog: HoursLog = { ...logData, id: `hl-${Date.now()}` };
    dispatch({ type: 'ADD_HOURS_LOG', payload: newLog });
  };

  const addBonus = (bonusData: Omit<Bonus, 'id'>) => {
    const newBonus: Bonus = { ...bonusData, id: `b-${Date.now()}` };
    dispatch({ type: 'ADD_BONUS', payload: newBonus });
  };
  
  const addPayment = (paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = { ...paymentData, id: `p-${Date.now()}` };
    dispatch({ type: 'ADD_PAYMENT', payload: newPayment });
  };

  const updateUserRate = (userId: string, newRate: number) => {
    dispatch({ type: 'UPDATE_USER_RATE', payload: { userId, newRate } });
  };
  
  const updateUserStoryRate = (userId: string, newRate: number) => {
    dispatch({ type: 'UPDATE_USER_STORY_RATE', payload: { userId, newRate } });
  };

  const updatePrinterStoryRate = (printerId: string, newRate: number) => {
    dispatch({ type: 'UPDATE_PRINTER_STORY_RATE', payload: { printerId, newRate } });
  };


  const getFilteredOrders = () => {
    if (!currentUser) return [];

    switch (currentUser.role) {
      case UserRole.Admin:
      case UserRole.Shipping:
        return state.orders;
      case UserRole.Sales:
        return state.orders.filter(o => o.status === OrderStatus.New || o.createdBy === currentUser.id);
      case UserRole.Designer:
        return state.orders.filter(o => o.assignedToDesigner === currentUser.id);
      case UserRole.Printer:
        return state.orders.filter(o => o.status === OrderStatus.Printing);
      default:
        return [];
    }
  };

  return {
    loading: state.loading,
    orders: state.orders,
    printers: state.printers,
    shippingCompanies: state.shippingCompanies,
    payments: state.payments,
    hoursLogs: state.hoursLogs,
    bonuses: state.bonuses,
    storyPrice: state.storyPrice,
    designers: state.users.filter(u => u.role === UserRole.Designer),
    getFilteredOrders,
    createOrder,
    updateOrderStatus,
    editOrder,
    deleteOrder,
    addHoursLog,
    addBonus,
    addPayment,
    updateUserRate,
    updateUserStoryRate,
    updatePrinterStoryRate,
  };
};