
import React, { useState } from 'react';
import { Order, OrderStatus, UserRole, Customer, StoryDetails } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { XCircleIcon } from '../ui/Icons';
import { formatDateTime, formatCurrency } from '../../lib/utils';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  const { currentUser } = useAuth();
  const { updateOrder, deleteOrder, designers, printers, shippingCompanies } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for actions
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [selectedIntlShipping, setSelectedIntlShipping] = useState('');
  const [intlTracking, setIntlTracking] = useState('');
  const [selectedDomShipping, setSelectedDomShipping] = useState('');
  const [domTracking, setDomTracking] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Customer>(order.customer);
  const [editedStory, setEditedStory] = useState<StoryDetails>(order.story);
  const [editedPrice, setEditedPrice] = useState(order.price);

  const currency = editedCustomer.country === 'مصر' ? 'EGP' : 'LYD';

  const isOrderCreator = currentUser?.id === order.createdBy;
  const canModify = currentUser?.role === UserRole.Admin || isOrderCreator;
  const canDelete = (currentUser?.role === UserRole.Admin) || (isOrderCreator && order.status === OrderStatus.New);

  const handleAssignDesigner = async () => {
    if (!selectedDesigner) return;
    const designer = designers.find(d => d.id === selectedDesigner);
    const updatedOrder = { ...order, status: OrderStatus.Designing, assignedToDesigner: selectedDesigner };
    await updateOrder(updatedOrder, `Assigned to Designer ${designer?.name}`);
    onClose();
  };

  const handleCompleteDesign = async () => {
    if (!selectedPrinter || !coverImageFile || !pdfFile) return;

    setIsSubmitting(true);
    try {
        const printer = printers.find(p => p.id === selectedPrinter);
        if (!printer) throw new Error("Selected printer not found");
        
        const updatedOrder = { 
            ...order, 
            status: OrderStatus.Printing, 
            assignedToPrinter: selectedPrinter, 
        };
        
        await updateOrder(
            updatedOrder, 
            `Completed Design & Assigned to ${printer.name}`, 
            { coverImageFile, pdfFile }
        );
        onClose();

    } catch (error) {
        console.error("Error completing design:", error);
        alert("Failed to upload files. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleFinishPrinting = async () => {
    if (!selectedIntlShipping || !intlTracking) return;
    const company = shippingCompanies.find(s => s.id === selectedIntlShipping);
    const updatedOrder = {
        ...order,
        status: OrderStatus.InternationalShipping,
        internationalShippingInfo: {
            company: company?.name || 'Unknown',
            trackingNumber: intlTracking,
            date: new Date()
        }
    };
    await updateOrder(updatedOrder, `Printing Complete. Shipped via ${company?.name}`);
    onClose();
  };

  const handleFinishPrintingAndShipDomestic = async () => {
    if (!selectedDomShipping || !domTracking) return;
    const company = shippingCompanies.find(s => s.id === selectedDomShipping);
    const updatedOrder = {
        ...order,
        status: OrderStatus.DomesticShipping,
        domesticShippingInfo: {
            company: company?.name || 'Unknown',
            trackingNumber: domTracking,
            date: new Date()
        }
    };
    await updateOrder(updatedOrder, `Printing Complete. Shipped domestically via ${company?.name}`);
    onClose();
  };
  
  const handleIntlArrival = async () => {
      if (!selectedDomShipping) return;
      const company = shippingCompanies.find(s => s.id === selectedDomShipping);
      const updatedOrder = {
          ...order,
          status: OrderStatus.DomesticShipping,
          domesticShippingInfo: {
              company: company?.name || 'Unknown',
              trackingNumber: domTracking || `DOM-${order.id}`, // Use tracking if available
              date: new Date()
          }
      };
      await updateOrder(updatedOrder, `Arrived in country. Forwarded to ${company?.name}`);
      onClose();
  };
  
  const handleMarkDelivered = async () => {
      const updatedOrder = { ...order, status: OrderStatus.Delivered, deliveryDate: new Date() };
      await updateOrder(updatedOrder, 'Marked as Delivered');
      onClose();
  };

  const handleCancelOrder = async () => {
    if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
        try {
            const updatedOrder = { ...order, status: OrderStatus.Cancelled };
            await updateOrder(updatedOrder, 'Order Cancelled');
            onClose();
        } catch (error: any) {
            console.error("Failed to cancel order:", error);
            alert(`Error: Could not cancel the order. ${error.message}`);
        }
    }
  };

  const handleDeleteOrder = async () => {
    if (window.confirm(`Are you sure you want to permanently delete order #${order.id.substring(0,8)}? This will also delete all associated files and cannot be undone.`)) {
        try {
            await deleteOrder(order.id);
            onClose();
        } catch (error: any) {
            console.error("Failed to delete order:", error);
            alert(`Error: Could not delete the order. ${error.message}`);
        }
    }
  };

  const handleSaveEdit = async () => {
    const updatedOrderData: Order = {
        ...order,
        customer: editedCustomer,
        story: editedStory,
        price: editedPrice,
    };
    await updateOrder(updatedOrderData, 'Order details updated');
    setIsEditing(false);
  };
  
  // Renders the form for designers to complete their task
  const renderDesignerActionForm = () => {
    const isReady = coverImageFile && pdfFile && selectedPrinter;
    return (
        <div className="mt-6 p-4 border-t bg-gray-50 rounded-b-lg">
             <h3 className="text-xl font-bold mb-2">Complete Design</h3>
             <p className="text-sm text-gray-600 mb-4">Please upload the final cover image and print-ready PDF before sending to the printer.</p>
             <div className="space-y-4">
                <div>
                   <label className="text-sm font-medium block mb-1">Cover Image (Required)</label>
                   <div className="flex items-center gap-4">
                       <label className="cursor-pointer bg-violet-100 text-violet-700 hover:bg-violet-200 font-semibold text-sm py-2 px-4 rounded-lg">
                           Choose File
                           <input type="file" accept="image/*" onChange={e => setCoverImageFile(e.target.files ? e.target.files[0] : null)} required className="hidden"/>
                       </label>
                       <span className="text-sm text-gray-500">{coverImageFile?.name || 'No file chosen'}</span>
                   </div>
                </div>
                 <div>
                   <label className="text-sm font-medium block mb-1">Final PDF (Required)</label>
                   <div className="flex items-center gap-4">
                       <label className="cursor-pointer bg-violet-100 text-violet-700 hover:bg-violet-200 font-semibold text-sm py-2 px-4 rounded-lg">
                           Choose File
                           <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files ? e.target.files[0] : null)} required className="hidden"/>
                       </label>
                       <span className="text-sm text-gray-500">{pdfFile?.name || 'No file chosen'}</span>
                   </div>
                </div>
                <select value={selectedPrinter} onChange={e => setSelectedPrinter(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm p-2">
                     <option value="">Select Printer</option>
                     {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={handleCompleteDesign} disabled={!isReady || isSubmitting} className={`w-full text-white px-4 py-2 rounded-md transition-colors ${!isReady || isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}>
                    {isSubmitting ? 'Submitting...' : 'Complete Design & Send to Printer'}
                </button>
                {!isReady && <p className="text-xs text-red-500 text-center mt-1">All fields are required to proceed.</p>}
             </div>
        </div>
    );
  };


  const renderFooterActions = () => {
    if (!currentUser || isEditing) return null;

    switch (order.status) {
      case OrderStatus.New:
        if (currentUser.role === UserRole.Sales || currentUser.role === UserRole.Admin) {
          return (
            <div className="p-4">
              <h4 className="font-semibold mb-2">Actions</h4>
              <div className="flex gap-2 items-end">
                <select value={selectedDesigner} onChange={e => setSelectedDesigner(e.target.value)} className="flex-grow border-gray-300 rounded-md shadow-sm">
                  <option value="">Select Designer</option>
                  {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button onClick={handleAssignDesigner} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Assign</button>
              </div>
            </div>
          );
        }
        return null;

      case OrderStatus.Printing:
        if (currentUser.role === UserRole.Printer || currentUser.role === UserRole.Admin) {
            if (order.customer.country === 'مصر') {
                const isDomesticShipReady = selectedDomShipping && domTracking;
                return (
                     <div className="p-4">
                         <h4 className="font-semibold mb-2">Actions (Ship to Egypt)</h4>
                         <div className="space-y-2">
                             <select value={selectedDomShipping} onChange={e => setSelectedDomShipping(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
                                <option value="">Select Domestic Shipping Co.</option>
                                {shippingCompanies.filter(s => s.type === 'Domestic').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                             <input type="text" placeholder="Tracking Number" value={domTracking} onChange={e => setDomTracking(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm" />
                             <button 
                                onClick={handleFinishPrintingAndShipDomestic} 
                                disabled={!isDomesticShipReady}
                                className={`w-full text-white px-4 py-2 rounded-md transition-colors ${isDomesticShipReady ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
                              >
                                Printing Complete & Ship Domestically
                             </button>
                             {!isDomesticShipReady && <p className="text-xs text-red-500 mt-1">Please select a shipping company and enter a tracking number.</p>}
                         </div>
                     </div>
                )
            } else { // For Libya and other countries
                const isIntlShipReady = selectedIntlShipping && intlTracking;
                return (
                     <div className="p-4">
                         <h4 className="font-semibold mb-2">Actions (Ship Internationally)</h4>
                         <div className="space-y-2">
                             <select value={selectedIntlShipping} onChange={e => setSelectedIntlShipping(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
                                <option value="">Select Intl. Shipping Co.</option>
                                {shippingCompanies.filter(s => s.type === 'International').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                             <input type="text" placeholder="Tracking Number" value={intlTracking} onChange={e => setIntlTracking(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm" />
                             <button 
                                onClick={handleFinishPrinting}
                                disabled={!isIntlShipReady}
                                className={`w-full text-white px-4 py-2 rounded-md transition-colors ${isIntlShipReady ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
                              >
                                Printing Complete & Ship Internationally
                             </button>
                             {!isIntlShipReady && <p className="text-xs text-red-500 mt-1">Please select an international shipping company and enter a tracking number.</p>}
                         </div>
                     </div>
                )
            }
        }
        return null;

      case OrderStatus.InternationalShipping:
        if (currentUser.role === UserRole.Shipping || currentUser.role === UserRole.Admin) {
            return (
                 <div className="p-4">
                     <h4 className="font-semibold mb-2">Actions</h4>
                     <div className="space-y-2">
                         <select value={selectedDomShipping} onChange={e => setSelectedDomShipping(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
                            <option value="">Select Domestic Shipping Co.</option>
                            {shippingCompanies.filter(s => s.type === 'Domestic').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         </select>
                          <input type="text" placeholder="New Tracking Number (Optional)" value={domTracking} onChange={e => setDomTracking(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm" />
                         <button onClick={handleIntlArrival} disabled={!selectedDomShipping} className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400">Confirm Arrival & Ship Locally</button>
                     </div>
                 </div>
            )
        }
        return null;
        
      case OrderStatus.DomesticShipping:
        if (currentUser.role === UserRole.Shipping || currentUser.role === UserRole.Admin) {
            return (
                <div className="p-4">
                    <h4 className="font-semibold mb-2">Actions</h4>
                    <button onClick={handleMarkDelivered} className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">Mark as Delivered</button>
                </div>
            )
        }
        return null;

      default:
        return null;
    }
  };

  const renderedFooterActions = renderFooterActions();
  const canCancel =
    (currentUser?.role === UserRole.Admin || (isOrderCreator && order.status === OrderStatus.New)) &&
    order.status !== OrderStatus.Delivered &&
    order.status !== OrderStatus.Cancelled;

  const renderContent = () => {
    if (isEditing) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Edit Form */}
                <div className="space-y-4 p-4 border rounded-md bg-gray-50">
                    <h3 className="font-semibold text-lg">Edit Customer Details</h3>
                    <div>
                        <label className="block text-sm font-medium">Name</label>
                        <input type="text" value={editedCustomer.name} onChange={e => setEditedCustomer({...editedCustomer, name: e.target.value})} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Address</label>
                        <input type="text" value={editedCustomer.address} onChange={e => setEditedCustomer({...editedCustomer, address: e.target.value})} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Country</label>
                        <select value={editedCustomer.country} onChange={e => setEditedCustomer({...editedCustomer, country: e.target.value})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                            <option value="مصر">مصر</option>
                            <option value="ليبيا">ليبيا</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Phone</label>
                        <input type="text" value={editedCustomer.phone} onChange={e => setEditedCustomer({...editedCustomer, phone: e.target.value})} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                </div>
                {/* Story Edit Form */}
                 <div className="space-y-4 p-4 border rounded-md bg-gray-50">
                    <h3 className="font-semibold text-lg">Edit Story Details</h3>
                    <div>
                        <label className="block text-sm font-medium">Owner</label>
                        <input type="text" value={editedStory.ownerName} onChange={e => setEditedStory({...editedStory, ownerName: e.target.value})} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Details</label>
                        <textarea value={editedStory.details} onChange={e => setEditedStory({...editedStory, details: e.target.value})} rows={3} className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Price ({currency})</label>
                        <input type="number" value={editedPrice} onChange={e => setEditedPrice(Number(e.target.value))} min="0" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                </div>
            </div>
        )
    }
    
    // Default View Mode
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2 border-b pb-2">Customer Info</h3>
                  <p><strong>Name:</strong> {order.customer.name}</p>
                  <p><strong>Address:</strong> {order.customer.address}</p>
                  <p><strong>Country:</strong> {order.customer.country}</p>
                  <p><strong>Phone:</strong> {order.customer.phone}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 border-b pb-2">Story Info</h3>
                  <p><strong>Owner:</strong> {order.story.ownerName || 'N/A'}</p>
                  <p><strong>Type:</strong> {order.story.type}</p>
                  <p><strong>Copies:</strong> {order.story.copies}</p>
                  <p><strong>Details:</strong> {order.story.details}</p>
                  <p className="mt-2"><strong>Price:</strong> <span className="font-bold text-green-600">{formatCurrency(order.price, order.customer.country)}</span></p>
                </div>
            </div>

             {order.coverImage && (
                <div>
                    <h3 className="font-semibold text-lg mb-2 border-b pb-2">Cover Image</h3>
                    <img src={order.coverImage.url} alt="Story Cover" className="w-full max-w-sm h-auto object-contain rounded-lg shadow-md mx-auto" />
                </div>
            )}
            
            {order.finalPdf && (
                 <div>
                     <h3 className="font-semibold text-lg mb-2 border-b pb-2">Print File</h3>
                     <a href={order.finalPdf.url} download={order.finalPdf.name} className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                        Download Final PDF ({order.finalPdf.name})
                    </a>
                </div>
            )}

             {order.referenceImages && order.referenceImages.length > 0 && (
                <div>
                    <h3 className="font-semibold text-lg mb-2 border-b pb-2">Reference Images</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {order.referenceImages.map((image, index) => (
                            <div key={index} className="group relative">
                                <img src={image.url} alt={image.name} className="w-full h-32 object-cover rounded-lg shadow-md" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center rounded-lg">
                                    <a href={image.url} download={image.name} className="text-white opacity-0 group-hover:opacity-100 p-2 bg-gray-800 rounded-full text-xs">Download</a>
                                </div>
                                <p className="text-xs truncate mt-1 text-gray-600">{image.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div>
                <h3 className="font-semibold text-lg mb-2 border-b pb-2">Activity Log</h3>
                <ul className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                    {[...(order.activityLog || [])].reverse().map((log, index) => (
                        <li key={index} className="p-2 bg-gray-50 rounded-md">
                            <span className="font-semibold text-gray-700">{log.user}</span> ({log.role}) - {log.action}
                            <span className="text-gray-500 block text-xs">{formatDateTime(log.timestamp)}</span>
                             {log.file && <a href={log.file.url} className="text-blue-500 text-xs block" target="_blank" rel="noopener noreferrer">View File: {log.file.name}</a>}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-11/12 md:w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 md:p-6 flex justify-between items-center border-b">
            <div>
                <h2 className="text-xl md:text-2xl font-bold">Order: <span title={order.id}>#{order.id.substring(0, 8)}</span></h2>
                <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${order.status === OrderStatus.Cancelled ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{order.status}</span>
            </div>
            <div className="flex items-center gap-2">
                {canModify && !isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-blue-600 hover:text-blue-800">Edit</button>
                )}
                {canDelete && !isEditing && (
                    <button onClick={handleDeleteOrder} className="text-sm font-medium text-red-600 hover:text-red-800">Delete</button>
                )}
                <button onClick={onClose}><XCircleIcon className="w-8 h-8 text-gray-500 hover:text-gray-800" /></button>
            </div>
        </div>
        
        <div className="p-4 md:p-6 overflow-y-auto flex-grow">
            {renderContent()}
            
            {/* Designer action form is now part of the main content */}
            {order.status === OrderStatus.Designing && (currentUser?.role === UserRole.Designer || currentUser?.role === UserRole.Admin) && !isEditing && renderDesignerActionForm()}
        </div>
        
        {isEditing && (
            <div className="p-4 md:p-6 border-t bg-gray-50 flex justify-end gap-4">
                 <button onClick={() => setIsEditing(false)} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                 <button onClick={handleSaveEdit} className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
            </div>
        )}

        {(!isEditing && (renderedFooterActions || canCancel)) && (
            <div className="p-4 md:p-6 border-t bg-gray-50">
                {renderedFooterActions}
                {canCancel && (
                    <div className={renderedFooterActions ? "mt-4 pt-4 border-t border-gray-200" : ""}>
                         <button
                            onClick={handleCancelOrder}
                            className="w-full bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
                        >
                            Cancel Order (Mark as Cancelled)
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailModal;
