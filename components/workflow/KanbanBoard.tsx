
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, UserRole } from '../../types';
import OrderCard from './OrderCard';
import OrderDetailModal from './OrderDetailModal';
import { PaletteIcon, PrinterIcon, TruckIcon, CheckCircleIcon, BriefcaseIcon, XCircleIcon } from '../ui/Icons';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';

interface KanbanColumn {
  title: string;
  orders: Order[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
}

const statusIcons: { [key: string]: React.FC<any> } = {
    'New Order': BriefcaseIcon,
    'Designing': PaletteIcon,
    'Printing': PrinterIcon,
    'International Shipping': TruckIcon,
    'Domestic Shipping': TruckIcon,
    'Delivered': CheckCircleIcon,
    'Cancelled': XCircleIcon
};

// A small modal component for assigning a designer
const AssignDesignerModal: React.FC<{ designers: any[], onAssign: (designerId: string) => void, onCancel: () => void }> = ({ designers, onAssign, onCancel }) => {
    const [selectedDesigner, setSelectedDesigner] = useState('');
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4">Assign Designer</h3>
                <select value={selectedDesigner} onChange={e => setSelectedDesigner(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm mb-4 p-2">
                    <option value="">Select a designer...</option>
                    {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                    <button onClick={() => onAssign(selectedDesigner)} disabled={!selectedDesigner} className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-gray-400">Assign</button>
                </div>
            </div>
        </div>
    );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);

  const { currentUser } = useAuth();
  // FIX: `useData` hook exports `editOrder`, not `updateOrder`.
  const { editOrder, designers, orders: allOrders } = useData();
  const isUserAdmin = currentUser?.role === UserRole.Admin;

  const handleCardClick = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleSelectOrder = (orderId: string) => {
    // Check status of first selected order if any
    if (selectedOrders.length > 0) {
        const firstSelectedStatus = allOrders.find(o => o.id === selectedOrders[0])?.status;
        const newOrderStatus = allOrders.find(o => o.id === orderId)?.status;
        if (firstSelectedStatus !== newOrderStatus) {
            alert("Please select orders from the same stage for bulk actions.");
            return;
        }
    }

    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };
  
  const clearSelection = () => {
      setSelectedOrders([]);
  }

  const currentSelectionStatus = useMemo(() => {
    if (selectedOrders.length === 0) return null;
    const firstOrder = allOrders.find(o => o.id === selectedOrders[0]);
    return firstOrder?.status || null;
  }, [selectedOrders, allOrders]);
  
  const handleBulkAssignDesigner = (designerId: string) => {
      const designer = designers.find(d => d.id === designerId);
      if(!designer) return;

      selectedOrders.forEach(orderId => {
          const orderToUpdate = allOrders.find(o => o.id === orderId);
          if (orderToUpdate && orderToUpdate.status === OrderStatus.New) {
              const updatedOrder = { ...orderToUpdate, status: OrderStatus.Designing, assignedToDesigner: designerId };
              editOrder(updatedOrder, `Bulk assigned to Designer ${designer.name}`);
          }
      });
      setAssignModalOpen(false);
      setSelectedOrders([]);
  };

  const handleBulkMarkDelivered = () => {
       if (window.confirm(`Are you sure you want to mark ${selectedOrders.length} orders as delivered?`)) {
            selectedOrders.forEach(orderId => {
                const orderToUpdate = allOrders.find(o => o.id === orderId);
                if (orderToUpdate && orderToUpdate.status === OrderStatus.DomesticShipping) {
                    const updatedOrder = { ...orderToUpdate, status: OrderStatus.Delivered, deliveryDate: new Date() };
                    editOrder(updatedOrder, 'Bulk marked as Delivered');
                }
            });
            setSelectedOrders([]);
       }
  };

  const renderBulkActions = () => {
      if (!isUserAdmin || selectedOrders.length === 0) return null;
      
      let actionButton = null;

      if (currentSelectionStatus === OrderStatus.New) {
          actionButton = <button onClick={() => setAssignModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Assign to Designer...</button>;
      } else if (currentSelectionStatus === OrderStatus.DomesticShipping) {
          actionButton = <button onClick={handleBulkMarkDelivered} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Mark as Delivered</button>;
      }

      return (
          <div className="fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 bg-gray-800 text-white p-4 shadow-lg flex justify-between items-center z-20">
              <span className="font-semibold">{selectedOrders.length} order(s) selected</span>
              <div className="flex items-center gap-4">
                  {actionButton || <span className="text-gray-400 text-sm">No bulk action for this stage.</span>}
                  <button onClick={clearSelection} className="text-gray-300 hover:text-white">Clear Selection</button>
              </div>
          </div>
      )
  }

  return (
    <div className={`space-y-6 ${isUserAdmin && selectedOrders.length > 0 ? 'pb-24' : ''}`}>
      {columns.map(column => (
        <div key={column.title} className="bg-gray-100/80 rounded-lg p-3 md:p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 text-xl mb-4 flex items-center gap-3">
            {React.createElement(statusIcons[column.title] || BriefcaseIcon, {className: "w-6 h-6"})}
            {column.title}
            <span className="text-base font-medium bg-gray-300 text-gray-700 rounded-full px-3 py-1">{column.orders.length}</span>
          </h3>
          <div className="space-y-4">
            {column.orders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onClick={() => handleCardClick(order)}
                isSelectable={isUserAdmin}
                isSelected={selectedOrders.includes(order.id)}
                onSelect={handleSelectOrder}
              />
            ))}
            {column.orders.length === 0 && (
                <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
                    No orders in this stage.
                </div>
            )}
          </div>
        </div>
      ))}

      {renderBulkActions()}

      {isAssignModalOpen && (
          <AssignDesignerModal 
              designers={designers}
              onAssign={handleBulkAssignDesigner}
              onCancel={() => setAssignModalOpen(false)}
          />
      )}

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};

export default KanbanBoard;