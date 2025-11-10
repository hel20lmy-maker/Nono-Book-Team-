
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { UserRole, OrderStatus, User, Printer } from '../../types';
import { XCircleIcon } from '../ui/Icons';

// Simple Modal Component
const ActionModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button onClick={onClose}><XCircleIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                </div>
                {children}
            </div>
        </div>
    );
};


const Accounts: React.FC = () => {
  const { currentUser, users } = useAuth();
  const { 
      orders, 
      payments, 
      storyPrice, 
      hoursLogs, 
      bonuses, 
      printers,
      addHoursLog, 
      addBonus, 
      addPayment, 
      updateUserRate,
      updateUserStoryRate,
      updatePrinterStoryRate,
    } = useData();

  const [modal, setModal] = useState<{type: 'hours' | 'rate' | 'bonus' | 'payment' | 'storyRate' | null, payee: User | Printer | null}>({type: null, payee: null});
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const openModal = (type: 'hours' | 'rate' | 'bonus' | 'payment' | 'storyRate', payee: User | Printer) => {
    setAmount(0);
    setNotes('');
    setModal({ type, payee });
  };

  const closeModal = () => {
    setModal({ type: null, payee: null });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.payee || amount <= 0) return;

    const isUser = 'role' in modal.payee;

    switch(modal.type) {
        case 'hours':
            if (isUser && modal.payee.role === UserRole.Sales) {
                addHoursLog({ userId: modal.payee.id, hours: amount, rate: modal.payee.hourlyRate || 0, date: new Date() });
            }
            break;
        case 'rate':
            if (isUser && modal.payee.role === UserRole.Sales) {
                updateUserRate(modal.payee.id, amount);
            }
            break;
        case 'storyRate':
            if (isUser && modal.payee.role === UserRole.Designer) {
                updateUserStoryRate(modal.payee.id, amount);
            } else if (!isUser) { // It's a Printer
                updatePrinterStoryRate(modal.payee.id, amount);
            }
            break;
        case 'bonus':
            if (isUser) {
                addBonus({ userId: modal.payee.id, amount, notes, date: new Date() });
            }
            break;
        case 'payment':
            if (isUser) {
                addPayment({ userId: modal.payee.id, amount, notes, date: new Date() });
            } else { // It's a Printer
                addPayment({ printerId: modal.payee.id, amount, notes, date: new Date() });
            }
            break;
    }
    closeModal();
  };

  const renderContent = () => {
    if (!currentUser) return null;

    const designerCompletedStatuses = [
        OrderStatus.Printing,
        OrderStatus.InternationalShipping,
        OrderStatus.DomesticShipping,
        OrderStatus.Delivered,
    ];
    
    const calculateSalesPayroll = (userId: string) => {
        const userLogs = hoursLogs.filter(h => h.userId === userId);
        const userBonuses = bonuses.filter(b => b.userId === userId);
        const userPayments = payments.filter(p => p.userId === userId);

        const totalHours = userLogs.reduce((sum, log) => sum + log.hours, 0);
        const earningsFromHours = userLogs.reduce((sum, log) => sum + (log.hours * log.rate), 0);
        const totalBonuses = userBonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
        const totalEarnings = earningsFromHours + totalBonuses;
        const totalPaid = userPayments.reduce((sum, p) => sum + p.amount, 0);
        const balance = totalEarnings - totalPaid;

        return { totalHours, earningsFromHours, totalBonuses, totalEarnings, totalPaid, balance };
    }

    if (currentUser.role === UserRole.Sales) {
        const payroll = calculateSalesPayroll(currentUser.id);
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold mb-4">Your Payroll Summary</h3>
                <div className="space-y-2">
                    <p><strong>Total Hours Logged:</strong> {payroll.totalHours}</p>
                    <p><strong>Earnings from Hours:</strong> ${payroll.earningsFromHours.toFixed(2)}</p>
                    <p><strong>Total Bonuses:</strong> ${payroll.totalBonuses.toFixed(2)}</p>
                    <p className="font-bold text-lg"><strong>Total Earnings:</strong> ${payroll.totalEarnings.toFixed(2)}</p>
                    <p><strong>Total Paid:</strong> ${payroll.totalPaid.toFixed(2)}</p>
                    <p className="font-bold text-lg mt-2 border-t pt-2"><strong>Balance Due:</strong> ${payroll.balance.toFixed(2)}</p>
                </div>
            </div>
        );
    }
    
    if (currentUser.role === UserRole.Designer) {
        const designerStoryRate = currentUser.storyRate || storyPrice;
        const completedDesigns = orders.filter(o => o.assignedToDesigner === currentUser.id && designerCompletedStatuses.includes(o.status)).length;
        const earnings = completedDesigns * designerStoryRate;
        const paid = payments.filter(p => p.userId === currentUser.id).reduce((sum, p) => sum + p.amount, 0);
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold">Your Earnings Summary</h3>
                <p>Completed Designs: {completedDesigns}</p>
                <p>Rate per Design: ${designerStoryRate}</p>
                <p>Total Earnings: ${earnings.toFixed(2)}</p>
                <p>Total Paid: ${paid.toFixed(2)}</p>
                <p className="font-bold mt-2">Balance Due: ${(earnings - paid).toFixed(2)}</p>
            </div>
        );
    }

    if (currentUser.role === UserRole.Admin) {
        const printerCompletedStatuses = [
          OrderStatus.InternationalShipping,
          OrderStatus.DomesticShipping,
          OrderStatus.Delivered,
        ];
        const baseButtonClasses = "text-xs font-semibold px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
        const rateButtonClasses = `${baseButtonClasses} bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500`;
        const paymentButtonClasses = `${baseButtonClasses} bg-yellow-200 text-yellow-900 hover:bg-yellow-300 focus:ring-yellow-500`;
        const hoursButtonClasses = `${baseButtonClasses} bg-blue-100 text-blue-800 hover:bg-blue-200 focus:ring-blue-500`;
        const bonusButtonClasses = `${baseButtonClasses} bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500`;

        return (
            <div>
                 <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
                 <div className="space-y-4">
                     {users.filter(u => u.role !== UserRole.Admin && u.role !== UserRole.Shipping && u.role !== UserRole.Printer).map(user => {
                        
                        if(user.role === UserRole.Designer) {
                           const designerStoryRate = user.storyRate || storyPrice;
                           const count = orders.filter(o => o.assignedToDesigner === user.id && designerCompletedStatuses.includes(o.status)).length;
                           const earnings = count * designerStoryRate;
                           const paid = payments.filter(p => p.userId === user.id).reduce((sum, p) => sum + p.amount, 0);
                           const balance = earnings - paid;
                           return (
                                <div key={user.id} className="bg-white p-4 rounded-lg shadow space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{user.name} ({user.role})</p>
                                            <p className="text-sm text-gray-500">{count} designs @ ${designerStoryRate}/story</p>
                                        </div>
                                        <div className="text-right">
                                            <p>Earnings: <span className="text-green-600">${earnings.toFixed(2)}</span></p>
                                            <p>Paid: <span className="text-red-600">-${paid.toFixed(2)}</span></p>
                                            <p className="font-bold border-t mt-1 pt-1">Balance: ${balance.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                                        <button onClick={() => openModal('storyRate', user)} className={rateButtonClasses}>Set Story Price</button>
                                        <button onClick={() => openModal('payment', user)} className={paymentButtonClasses}>Add Payment</button>
                                    </div>
                                </div>
                           )
                        }
                        if (user.role === UserRole.Sales) {
                            const payroll = calculateSalesPayroll(user.id);
                            return (
                                <div key={user.id} className="bg-white p-4 rounded-lg shadow space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{user.name} ({user.role})</p>
                                            <p className="text-sm text-gray-500">Current Rate: ${user.hourlyRate}/hr</p>
                                        </div>
                                        <div className="text-right">
                                            <p>Total Earnings: <span className="text-green-600">${payroll.totalEarnings.toFixed(2)}</span></p>
                                            <p>Total Paid: <span className="text-red-600">-${payroll.totalPaid.toFixed(2)}</span></p>
                                            <p className="font-bold border-t mt-1 pt-1">Balance: ${payroll.balance.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-600 border-t pt-2">
                                        Details: {payroll.totalHours} hrs | ${payroll.totalBonuses.toFixed(2)} in bonuses
                                    </div>
                                    <div className="space-y-2 pt-2 border-t">
                                        <div className="flex gap-2">
                                            <button onClick={() => openModal('hours', user)} className={`${hoursButtonClasses} flex-1`}>Add Hours</button>
                                            <button onClick={() => openModal('bonus', user)} className={`${bonusButtonClasses} flex-1`}>Add Bonus</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openModal('payment', user)} className={`${paymentButtonClasses} flex-1`}>Add Payment</button>
                                            <button onClick={() => openModal('rate', user)} className={`${rateButtonClasses} flex-1`}>Set Rate</button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                        return null;
                     })}
                 </div>

                 <h2 className="text-2xl font-semibold my-4 pt-4 border-t">Printer Accounts</h2>
                 <div className="space-y-4">
                     {printers.map(printer => {
                         const printerStoryRate = printer.storyRate || storyPrice;
                         const count = orders.filter(o => o.assignedToPrinter === printer.id && printerCompletedStatuses.includes(o.status)).length;
                         const earnings = count * printerStoryRate;
                         const paid = payments.filter(p => p.printerId === printer.id).reduce((sum, p) => sum + p.amount, 0);
                         const balance = earnings - paid;
                         return (
                             <div key={printer.id} className="bg-white p-4 rounded-lg shadow space-y-3">
                                 <div className="flex justify-between items-start">
                                     <div>
                                         <p className="font-bold">{printer.name} (Printer)</p>
                                         <p className="text-sm text-gray-500">{count} orders printed @ ${printerStoryRate}/order</p>
                                     </div>
                                     <div className="text-right">
                                         <p>Earnings: <span className="text-green-600">${earnings.toFixed(2)}</span></p>
                                         <p>Paid: <span className="text-red-600">-${paid.toFixed(2)}</span></p>
                                         <p className="font-bold border-t mt-1 pt-1">Balance: ${balance.toFixed(2)}</p>
                                     </div>
                                 </div>
                                 <div className="flex flex-wrap gap-2 pt-2 border-t">
                                     <button onClick={() => openModal('storyRate', printer)} className={rateButtonClasses}>Set Story Price</button>
                                     <button onClick={() => openModal('payment', printer)} className={paymentButtonClasses}>Add Payment</button>
                                 </div>
                             </div>
                         )
                     })}
                 </div>
            </div>
        )
    }

    return <p>Accounting information is not available for your role.</p>;
  };

  const getModalContent = () => {
      if (!modal.type || !modal.payee) return null;
      let title = '', label = '', inputType = 'number';
      
      switch(modal.type) {
        case 'hours': title = 'Add Hours'; label = 'Number of Hours'; break;
        case 'rate': title = 'Set New Hourly Rate'; label = 'New Rate ($)'; break;
        case 'storyRate': title = 'Set New Story Rate'; label = 'New Rate ($)'; break;
        case 'bonus': title = 'Add Bonus'; label = 'Bonus Amount ($)'; break;
        case 'payment': title = 'Add Payment'; label = 'Payment Amount ($)'; break;
      }

      return (
        <ActionModal title={`${title} for ${modal.payee.name}`} onClose={closeModal}>
            <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                <input 
                    type={inputType}
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    required
                    min="0.01"
                    step="0.01"
                />
                {(modal.type === 'bonus' || modal.type === 'payment') && (
                     <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <input 
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                )}
                <div className="mt-6 flex justify-end">
                    <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                </div>
            </form>
        </ActionModal>
      );
  }

  return <div>{renderContent()}{getModalContent()}</div>;
};

export default Accounts;