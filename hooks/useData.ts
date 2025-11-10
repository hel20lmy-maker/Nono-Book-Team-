
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
    
    // 1. Prepare order data for insertion
    const initialActivity: ActivityLogEntry = {
        user: currentUser.name,
        role: currentUser.role,
        action: 'Created Order',
        timestamp: new Date()
    };
    
    // Manually construct payload to ensure snake_case and avoid sending invalid fields like 'createdBy'
    const dbPayload = {
      status: orderData.status,
      customer: orderData.customer,
      story: orderData.story,
      price: orderData.price,
      created_by: currentUser.id,
      created_at: new Date(),
      activity_log: [initialActivity],
      reference_images: [], // Initially empty, will be updated after file uploads
    };

    const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert(dbPayload)
        .select()
        .single();
    
    if (insertError) {
      console.error('Supabase create order error:', insertError);
      throw insertError;
    }

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
      
      // 1. Fetch the order to get file paths
      const { data: order, error: fetchError } = await supabase
          .from('orders')
          .select('reference_images, final_pdf, cover_image')
          .eq('id', orderId)
          .single();

      // If fetch fails but it's not a "not found" error, throw.
      if (fetchError && fetchError.code !== 'PGRST116') {
          console.error("Error fetching order before deletion:", fetchError);
          throw fetchError;
      }
      
      // 2. If order exists, collect and delete associated files
      if (order) {
          const fileUrls: string[] = [];
          (order.reference_images || []).forEach((file: any) => file && file.url && fileUrls.push(file.url));
          if (order.final_pdf?.url) fileUrls.push(order.final_pdf.url);
          if (order.cover_image?.url) fileUrls.push(order.cover_image.url);

          const filePaths = fileUrls.map(url => {
              try {
                  const urlParts = new URL(url).pathname.split('/order-files/');
                  return urlParts[1];
              } catch (e) {
                  console.warn("Could not parse file URL for deletion:", url);
                  return null;
              }
          }).filter((p): p is string => p !== null);

          if (filePaths.length > 0) {
              const { error: storageError } = await supabase.storage.from('order-files').remove(filePaths);
              if (storageError) {
                  // Log the error but proceed with DB deletion to avoid leaving the user in a broken state.
                  console.error("Failed to delete associated files from storage, but proceeding with DB deletion:", storageError);
              }
          }
      }

      // 3. Delete the order from the database
      const { error: deleteError } = await supabase.from('orders').delete().eq('id', orderId);
      if (deleteError) throw deleteError;
      
      dispatch({ type: 'DELETE_ORDER', payload: orderId });
  };

  const addHoursLog = async (logData: Omit<HoursLog, 'id'>) => {
    if (!supabase) throw new Error("Supabase not configured");
    const dbPayload = {
      user_id: logData.userId,
      hours: logData.hours,
      rate: logData.rate,
      date: logData.date,
    };
    const { data, error } = await supabase.from('hours_logs').insert(dbPayload).select().single();
    if (error) throw error;
    dispatch({ type: 'ADD_HOURS_LOG', payload: mapToCamelCase(data) });
  };

  const addBonus = async (bonusData: Omit<Bonus, 'id'>) => {
    if (!supabase) throw new Error("Supabase not configured");
    const dbPayload = {
      user_id: bonusData.userId,
      amount: bonusData.amount,
      date: bonusData.date,
      notes: bonusData.notes,
    };
    const { data, error } = await supabase.from('bonuses').insert(dbPayload).select().single();
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
