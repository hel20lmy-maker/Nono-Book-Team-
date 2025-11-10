import React from 'react';
import { Order, OrderStatus } from '../../types';
import { useData } from '../../hooks/useData';
import { formatDate, formatCurrency } from '../../lib/utils';

interface OrderCardProps {
  order: Order;
  onClick: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick, isSelectable, isSelected, onSelect }) => {
  const { designers, printers } = useData();

  const assigneeInfo = React.useMemo(() => {
    switch (order.status) {
      case OrderStatus.Designing: {
        const designer = designers.find(d => d.id === order.assignedToDesigner);
        return designer?.name || null;
      }
      case OrderStatus.Printing: {
        const printer = printers.find(p => p.id === order.assignedToPrinter);
        return printer?.name || null;
      }
      case OrderStatus.InternationalShipping:
        return order.internationalShippingInfo?.company || null;
      case OrderStatus.DomesticShipping:
        return order.domesticShippingInfo?.company || null;
      default:
        return null;
    }
  }, [order.status, order.assignedToDesigner, order.assignedToPrinter, order.internationalShippingInfo, order.domesticShippingInfo, designers, printers]);

  return (
    <div 
        className={`relative bg-white rounded-lg shadow hover:shadow-lg transition-all flex items-start p-4 ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'ring-0'}`}
        onClick={isSelectable ? () => onSelect?.(order.id) : onClick}
    >
      {isSelectable && (
          <div className="mr-4 flex-shrink-0 h-full flex items-center">
              <input 
                  type="checkbox" 
                  readOnly
                  checked={isSelected}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  aria-label={`Select order ${order.id}`}
              />
          </div>
      )}
      <div 
        onClick={(e) => {
            if (isSelectable) {
                e.stopPropagation(); // prevent select when clicking the view details part
            }
            onClick();
        }} 
        className="cursor-pointer w-full"
      >
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-gray-800" title={order.id}>#{order.id.substring(0, 8)}</h4>
            <span className="text-sm font-semibold text-blue-600">{formatCurrency(order.price, order.customer.country)}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Customer: {order.customer.name}</p>
          <p className="text-sm text-gray-600">Country: {order.customer.country}</p>
          {assigneeInfo && (
            <p className="text-sm font-medium text-purple-600 mt-2">{assigneeInfo}</p>
          )}
          <p className="text-sm text-gray-500 mt-3">
            Created: {formatDate(order.createdAt)}
          </p>
      </div>
    </div>
  );
};

export default OrderCard;
