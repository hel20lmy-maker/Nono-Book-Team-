import React, { useState, useEffect } from 'react';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { Customer, StoryDetails, Order, OrderStatus } from '../../types';
import { XCircleIcon } from '../ui/Icons';

interface CreateOrderModalProps {
  onClose: () => void;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ onClose }) => {
  const { createOrder } = useData();
  const { currentUser } = useAuth();
  const [customer, setCustomer] = useState<Customer>({ name: '', address: '', country: 'مصر', phone: '', altPhone: '' });
  const [story, setStory] = useState<StoryDetails>({ ownerName: '', details: '', type: 'Hardcover', copies: 1 });
  const [price, setPrice] = useState(0);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const currency = customer.country === 'مصر' ? 'EGP' : 'LYD';

  useEffect(() => {
    // Create blob URLs for previews
    const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
    
    // Cleanup function
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };
  
  const handleStoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setStory({ ...story, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        setImageFiles(prev => [...prev, ...files]);
    }
  };

  const removeImage = (index: number) => {
      setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsUploading(true);
    try {
        const newOrderData: Omit<Order, 'id' | 'createdAt' | 'activityLog' | 'referenceImages'> = {
            status: OrderStatus.New,
            customer,
            story,
            price,
            createdBy: currentUser.id,
        };
        await createOrder(newOrderData, imageFiles);
        onClose();
    } catch (error: any) {
        console.error("Failed to create order:", error);
        const errorMessage = error.message || "An unknown error occurred. Please check the console for details.";
        alert(`Failed to create order:\n${errorMessage}`);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 md:p-8 shadow-2xl w-11/12 md:w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Create New Order</h2>
          <button onClick={onClose}><XCircleIcon className="w-8 h-8 text-gray-500 hover:text-gray-800" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Customer Details */}
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="font-semibold text-lg">Customer Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input type="text" name="name" value={customer.name} onChange={handleCustomerChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input type="text" name="address" value={customer.address} onChange={handleCustomerChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <select name="country" value={customer.country} onChange={handleCustomerChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                      <option value="مصر">مصر</option>
                      <option value="ليبيا">ليبيا</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Phone</label>
                  <input type="tel" name="phone" value={customer.phone} onChange={handleCustomerChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Phone</label>
                  <input type="tel" name="altPhone" value={customer.altPhone} onChange={handleCustomerChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Story Details */}
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="font-semibold text-lg">Story Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Story Owner Name</label>
                  <input type="text" name="ownerName" value={story.ownerName} onChange={handleStoryChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Details</label>
                  <textarea name="details" value={story.details} onChange={handleStoryChange} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Story Type</label>
                  <select name="type" value={story.type} onChange={handleStoryChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                      <option>Hardcover</option>
                      <option>Paperback</option>
                      <option>Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Number of Copies</label>
                  <input type="number" name="copies" value={story.copies} onChange={handleStoryChange} min="1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price ({currency})</label>
                  <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min="0" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                </div>
              </div>
              {/* Image Upload */}
              <div className="space-y-2 p-4 border rounded-md">
                 <h3 className="font-semibold text-lg">Reference Images</h3>
                 <input type="file" multiple onChange={handleImageUpload} accept="image/*" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                 {isUploading && <p className="text-sm text-gray-500">Processing images...</p>}
                 {imagePreviews.length > 0 && (
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                         {imagePreviews.map((previewUrl, index) => (
                             <div key={index} className="relative">
                                 <img src={previewUrl} alt={imageFiles[index].name} className="w-full h-24 object-cover rounded-md" />
                                 <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 text-xs">&times;</button>
                                 <p className="text-xs truncate text-gray-600">{imageFiles[index].name}</p>
                             </div>
                         ))}
                     </div>
                 )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={isUploading}>
              {isUploading ? 'Saving...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;
