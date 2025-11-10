import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Order, User, UserRole, OrderStatus, ActivityLogEntry, HoursLog, Bonus, Payment } from '../types';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabaseClient';
import { mapToCamelCase } from '../lib/utils';


// Helper function to map Supabase order (snake_case) to frontend Order (camelCase) and parse dates.
const mapDbOrderToStateOrder = (dbOrder: any): Order => {
    const order = mapToCamelCase(dbOrder);
    return {
        ...order,
        createdAt: new Date(order.createdAt),
        deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : undefined,
        activityLog: (order.activityLog || []).map((log: any) => ({
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
    };
}

export const useData = () => {
  const { state, dispatch } = useContext(AppContext);
  const { currentUser } = useAuth();

  const uploadOrderFile = async (file: File, orderId: string): Promise<{ name: string; url: string }> => {
    if (!supabase) throw new Error("Supabase not configured");
    const filePath = `public/${orderId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('order-files').upload(filePath, file);
    if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
    }
    const { data } = supabase.storage.from('order-files').getPublicUrl(filePath);
    return { name: file.name, url: data.publicUrl };
  };


  const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'activityLog' | 'referenceImages'>, files: File[]) => {
    if (!currentUser || !supabase) throw new Error("User not authenticated");
    
    // 1. Insert order data to get a new order ID
    const initialActivity: ActivityLogEntry = {
        user: currentUser.name,
        role: currentUser.role,
        action: 'Created Order',
        timestamp: new Date()
    };
    
    const dbPayload = {
        ...orderData,
        created_by: currentUser.id, // snake_case for DB
        created_at: new Date(),
        activity_log: [initialActivity],
        reference_images: []
    };

    const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert(dbPayload)
        .select()
        .single();
    
    if (insertError) throw insertError;

    // 2. Upload files using the new order ID
    const uploadPromises = files.map(file => uploadOrderFile(file, newOrder.id));
    const uploadedImages = await Promise.all(uploadPromises);

    // 3. Update the order with the file URLs
    const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ reference_images: uploadedImages })
        .eq('id', newOrder.id)
        .select()
        .single();

    if (updateError) throw updateError;
    
    dispatch({ type: 'ADD_ORDER', payload: mapDbOrderToStateOrder(updatedOrder) });
  };
  
  const updateOrder = async (order: Order, actionDescription: string, newFiles?: { coverImageFile?: File, pdfFile?: File }) => {
    if (!currentUser || !supabase) throw new Error("User not authenticated");
    
    let updatedOrderData = { ...order };

    // Handle file uploads if they exist
    if (newFiles?.coverImageFile) {
        const coverImage = await uploadOrderFile(newFiles.coverImageFile, order.id);
        updatedOrderData.coverImage = coverImage;
    }
    if (newFiles?.pdfFile) {
        const finalPdf = await uploadOrderFile(newFiles.pdfFile, order.id);
        updatedOrderData.finalPdf = finalPdf;
    }

    const newActivityLog: ActivityLogEntry = {
        user: currentUser.name,
        role: currentUser.role,
        action: actionDescription,
        timestamp: new Date(),
    };

    if (newFiles?.pdfFile && updatedOrderData.finalPdf) {
        newActivityLog.file = { name: newFiles.pdfFile.name, url: updatedOrderData.finalPdf.url };
    }

    updatedOrderData.activityLog = [...order.activityLog, newActivityLog];
    
    // Omit fields that cannot be updated directly or are handled by DB
    const { id, createdBy, createdAt, ...updatePayload } = updatedOrderData;
    
    // Convert to snake_case for Supabase
    const dbPayload = {
      status: updatePayload.status,
      customer: updatePayload.customer,
      story: updatePayload.story,
      price: updatePayload.price,
      reference_images: updatePayload.referenceImages,
      final_pdf: updatePayload.finalPdf,
      cover_image: updatePayload.coverImage,
      assigned_to_designer: updatePayload.assignedToDesigner,
      assigned_to_printer: updatePayload.assignedToPrinter,
      international_shipping_info: updatePayload.internationalShippingInfo,
      domestic_shipping_info: updatePayload.domesticShippingInfo,
      delivery_date: updatePayload.deliveryDate,
      activity_log: updatePayload.activityLog,
    };
    
    const { data: savedOrder, error } = await supabase
        .from('orders')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    
    dispatch({ type: 'UPDATE_ORDER', payload: mapDbOrderToStateOrder(savedOrder) });
  }

  const deleteOrder = async (orderId: string) => {
      if (!supabase) throw new Error("Supabase not configured");
      // TODO: Add logic to delete files from storage if needed
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      dispatch({ type: 'DELETE_ORDER', payload: orderId });
  };

  const addHoursLog = async (logData: Omit<HoursLog, 'id'>) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.from('hours_logs').insert({user_id: logData.userId, ...logData}).select().single();
    if (error) throw error;
    dispatch({ type: 'ADD_HOURS_LOG', payload: mapToCamelCase(data) });
  };

  const addBonus = async (bonusData: Omit<Bonus, 'id'>) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.from('bonuses').insert({user_id: bonusData.userId, ...bonusData}).select().single();
    if (error) throw error;
    dispatch({ type: 'ADD_BONUS', payload: mapToCamelCase(data) });
  };
  
  const addPayment = async (paymentData: Omit<Payment, 'id'>) => {
    if (!supabase) throw new Error("Supabase not configured");
    const dbPayload = {
        user_id: paymentData.userId,
        printer_id: paymentData.printerId,
        amount: paymentData.amount,
        date: paymentData.date,
        notes: paymentData.notes
    };
    const { data, error } = await supabase.from('payments').insert(dbPayload).select().single();
    if (error) throw error;
    dispatch({ type: 'ADD_PAYMENT', payload: mapToCamelCase(data) });
  };

  const updateUserRate = async (userId: string, newRate: number) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from('users').update({ hourly_rate: newRate }).eq('id', userId);
    if (error) throw error;
    dispatch({ type: 'UPDATE_USER_RATE', payload: { userId, newRate } });
  };
  
  const updateUserStoryRate = async (userId: string, newRate: number) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from('users').update({ story_rate: newRate }).eq('id', userId);
    if (error) throw error;
    dispatch({ type: 'UPDATE_USER_STORY_RATE', payload: { userId, newRate } });
  };

  const updatePrinterStoryRate = async (printerId: string, newRate: number) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from('printers').update({ story_rate: newRate }).eq('id', printerId);
    if (error) throw error;
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
    users: state.users,
    printers: state.printers,
    shippingCompanies: state.shippingCompanies,
    payments: state.payments,
    hoursLogs: state.hoursLogs,
    bonuses: state.bonuses,
    storyPrice: state.storyPrice,
    designers: state.users.filter(u => u.role === UserRole.Designer),
    getFilteredOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    addHoursLog,
    addBonus,
    addPayment,
    updateUserRate,
    updateUserStoryRate,
    updatePrinterStoryRate,
  };
};
