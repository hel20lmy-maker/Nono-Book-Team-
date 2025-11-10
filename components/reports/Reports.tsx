
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { UserRole, OrderStatus } from '../../types';
import { USD_TO_EGP_RATE, USD_TO_LYD_RATE } from '../../constants';

const Reports: React.FC = () => {
  // FIX: The `useAuth` hook does not return the list of users.
  // The `users` array is fetched from the `useData` hook instead.
  const { currentUser } = useAuth();
  const { orders, printers, users: USERS } = useData();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const filteredOrders = orders.filter(o => new Date(o.createdAt).getMonth() === selectedMonth);

  const countryStats = useMemo(() => {
    const stats = {
        egypt: { count: 0, totalValue: 0 },
        libya: { count: 0, totalValue: 0 },
    };

    for (const order of filteredOrders) {
        if (order.customer.country === 'مصر') {
            stats.egypt.count++;
            stats.egypt.totalValue += order.price;
        } else if (order.customer.country === 'ليبيا') {
            stats.libya.count++;
            stats.libya.totalValue += order.price;
        }
    }
    return stats;
  }, [filteredOrders]);

  const getSalesReports = () => {
    if (currentUser?.role === UserRole.Sales) {
      const myOrders = filteredOrders.filter(o => o.createdBy === currentUser.id).length;
      return <p>You created {myOrders} orders this month.</p>;
    }
    // Admin view
    const salesUsers = USERS.filter(u => u.role === UserRole.Sales);
    return salesUsers.map(user => {
      const count = filteredOrders.filter(o => o.createdBy === user.id).length;
      return <div key={user.id} className="p-4 bg-white rounded shadow">{user.name}: {count} orders</div>;
    });
  };

  const getDesignerReports = () => {
    const designerCompletedStatuses = [
      OrderStatus.Printing,
      OrderStatus.InternationalShipping,
      OrderStatus.DomesticShipping,
      OrderStatus.Delivered,
    ];
    if (currentUser?.role === UserRole.Designer) {
      const myDesigns = filteredOrders.filter(o => o.assignedToDesigner === currentUser.id && designerCompletedStatuses.includes(o.status)).length;
      return <p>You completed {myDesigns} designs this month.</p>;
    }
    // Admin view
    const designerUsers = USERS.filter(u => u.role === UserRole.Designer);
    return designerUsers.map(user => {
      const count = filteredOrders.filter(o => o.assignedToDesigner === user.id && designerCompletedStatuses.includes(o.status)).length;
      return <div key={user.id} className="p-4 bg-white rounded shadow">{user.name}: {count} designs</div>;
    });
  };

  const getPrinterReports = () => {
    const printerCompletedStatuses = [
      OrderStatus.InternationalShipping,
      OrderStatus.DomesticShipping,
      OrderStatus.Delivered,
    ];
    
    // Admin or Printer role view
    return printers.map(printer => {
      const count = filteredOrders.filter(o => o.assignedToPrinter === printer.id && printerCompletedStatuses.includes(o.status)).length;
      return <div key={printer.id} className="p-4 bg-white rounded shadow">{printer.name}: {count} orders printed</div>;
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Monthly Reports</h2>
        <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="p-2 border rounded">
          {[...Array(12).keys()].map(i => (
            <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
          ))}
        </select>
      </div>

      {(currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.Sales) && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Sales Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{getSalesReports()}</div>
        </div>
      )}

      {(currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.Designer) && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Designer Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{getDesignerReports()}</div>
        </div>
      )}
      
      {(currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.Printer) && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Printer Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{getPrinterReports()}</div>
        </div>
      )}

      {currentUser?.role === UserRole.Admin && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Country Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded shadow space-y-2">
                <h4 className="font-bold text-lg flex items-center">
                    <span className="text-2xl mr-2">🇪🇬</span> Egypt (مصر)
                </h4>
                <p><strong>Total Orders:</strong> {countryStats.egypt.count}</p>
                <p><strong>Total Revenue:</strong> <span className="font-semibold text-green-700">{(countryStats.egypt.totalValue * USD_TO_EGP_RATE).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</span></p>
            </div>
            <div className="p-4 bg-white rounded shadow space-y-2">
                <h4 className="font-bold text-lg flex items-center">
                    <span className="text-2xl mr-2">🇱🇾</span> Libya (ليبيا)
                </h4>
                <p><strong>Total Orders:</strong> {countryStats.libya.count}</p>
                <p><strong>Total Revenue:</strong> <span className="font-semibold text-green-700">{(countryStats.libya.totalValue * USD_TO_LYD_RATE).toLocaleString('ar-LY', { style: 'currency', currency: 'LYD' })}</span></p>
            </div>
          </div>
        </div>
      )}

      {currentUser?.role === UserRole.Admin && (
        <div>
            <h3 className="text-xl font-semibold mb-4">General Reports</h3>
            <div className="p-4 bg-white rounded shadow space-y-2">
                <p>Total Orders this month: {filteredOrders.length}</p>
                <p>Total Delivered this month: {filteredOrders.filter(o => o.status === OrderStatus.Delivered).length}</p>
                <p className="font-semibold text-red-600">Total Cancelled this month: {filteredOrders.filter(o => o.status === OrderStatus.Cancelled).length}</p>
                <p>Orders in Designing: {filteredOrders.filter(o => o.status === OrderStatus.Designing).length}</p>
                <p>Orders in Printing: {filteredOrders.filter(o => o.status === OrderStatus.Printing).length}</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
