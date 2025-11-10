
import React, { useState } from 'react';
import { OrderStatus, UserRole } from '../../types';
import KanbanBoard from './KanbanBoard';
import CreateOrderModal from './CreateOrderModal';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { PlusCircleIcon } from '../ui/Icons';

const Workflow: React.FC = () => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const { currentUser } = useAuth();
  const { orders } = useData();

  const getVisibleStatuses = () => {
    if (currentUser?.role === UserRole.Admin) {
      return Object.values(OrderStatus);
    }
    switch (currentUser?.role) {
      case UserRole.Sales: return [OrderStatus.New];
      case UserRole.Designer: return [OrderStatus.Designing];
      case UserRole.Printer: return [OrderStatus.Printing];
      case UserRole.Shipping: return [OrderStatus.InternationalShipping, OrderStatus.DomesticShipping];
      default: return [];
    }
  };
  
  const visibleStatuses = getVisibleStatuses();

  const getFilteredOrdersForStatus = (status: OrderStatus) => {
    if (!currentUser) return [];
    
    switch (currentUser.role) {
      case UserRole.Admin:
      case UserRole.Shipping: // Shipping sees both shipping stages
        return orders.filter(o => o.status === status);
      case UserRole.Sales:
        return orders.filter(o => o.status === OrderStatus.New);
      case UserRole.Designer:
        return orders.filter(o => o.status === OrderStatus.Designing && o.assignedToDesigner === currentUser.id);
      case UserRole.Printer:
         // Simplified for mock. A real app would check a printer ID.
        return orders.filter(o => o.status === OrderStatus.Printing);
      default:
        return [];
    }
  }

  const columns = visibleStatuses.map(status => ({
    title: status,
    orders: getFilteredOrdersForStatus(status)
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-700">Order Workflow</h2>
        {(currentUser?.role === UserRole.Sales || currentUser?.role === UserRole.Admin) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            New Order
          </button>
        )}
      </div>
      <KanbanBoard columns={columns} />
      {isCreateModalOpen && (
        <CreateOrderModal onClose={() => setCreateModalOpen(false)} />
      )}
    </div>
  );
};

export default Workflow;