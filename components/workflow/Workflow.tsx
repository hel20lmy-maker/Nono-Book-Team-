import React, { useState, useContext, useMemo } from 'react';
import { OrderStatus, UserRole } from '../../types';
import KanbanBoard from './KanbanBoard';
import CreateOrderModal from './CreateOrderModal';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { PlusCircleIcon, SearchIcon } from '../ui/Icons';
import { AppContext } from '../../context/AppContext';
import { normalizeNumerals } from '../../lib/utils';

const Workflow: React.FC = () => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const { currentUser } = useAuth();
  const { orders } = useData();
  const { state, dispatch } = useContext(AppContext);
  const { searchQuery } = state;
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_SEARCH_QUERY', payload: localQuery });
  };

  const searchedOrders = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
        return orders;
    }

    const normalizedQuery = normalizeNumerals(searchQuery.trim());
    const lowercasedQuery = normalizedQuery.toLowerCase();
    const numericQuery = normalizedQuery.replace(/\D/g, '');


    return orders.filter(order => {
        const normalizedPhone = normalizeNumerals(order.customer.phone).replace(/\D/g, '');
        const normalizedAltPhone = order.customer.altPhone ? normalizeNumerals(order.customer.altPhone).replace(/\D/g, '') : '';
        
        return (numericQuery.length > 0 && normalizedPhone.includes(numericQuery)) ||
            (numericQuery.length > 0 && normalizedAltPhone && normalizedAltPhone.includes(numericQuery)) ||
            order.customer.name.toLowerCase().includes(lowercasedQuery) ||
            order.id.toLowerCase().includes(lowercasedQuery);
    });
  }, [orders, searchQuery]);


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
        return searchedOrders.filter(o => o.status === status);
      case UserRole.Sales:
        return searchedOrders.filter(o => o.status === OrderStatus.New);
      case UserRole.Designer:
        return searchedOrders.filter(o => o.status === OrderStatus.Designing && o.assignedToDesigner === currentUser.id);
      case UserRole.Printer:
         // Simplified for mock. A real app would check a printer ID.
        return searchedOrders.filter(o => o.status === OrderStatus.Printing);
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
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-2xl font-semibold text-gray-700">Order Workflow</h2>
        <form onSubmit={handleSearch} className="w-full md:w-auto flex items-center gap-2">
            <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </span>
                <input 
                    type="text"
                    placeholder="Search by name, phone, or ID..."
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <button
                type="submit"
                className="flex items-center justify-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                aria-label="Search"
            >
                <SearchIcon className="w-5 h-5 sm:hidden" />
                <span className="hidden sm:inline">Search</span>
            </button>
        </form>
      </div>
      
      <div className="mb-6">
        {(currentUser?.role === UserRole.Sales || currentUser?.role === UserRole.Admin) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors w-full md:w-auto"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>Create New Order</span>
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
