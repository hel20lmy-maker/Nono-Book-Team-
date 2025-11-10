
import React from 'react';
import { useData } from '../../hooks/useData';
import { OrderStatus } from '../../types';
import { 
    BriefcaseIcon, 
    PaletteIcon, 
    PrinterIcon, 
    TruckIcon, 
    CheckCircleIcon, 
    XCircleIcon 
} from '../ui/Icons';

const statusInfo: { [key in OrderStatus]: { icon: React.FC<any>, color: string, textColor: string } } = {
    [OrderStatus.New]: { icon: BriefcaseIcon, color: 'bg-blue-100', textColor: 'text-blue-600' },
    [OrderStatus.Designing]: { icon: PaletteIcon, color: 'bg-purple-100', textColor: 'text-purple-600' },
    [OrderStatus.Printing]: { icon: PrinterIcon, color: 'bg-indigo-100', textColor: 'text-indigo-600' },
    [OrderStatus.InternationalShipping]: { icon: TruckIcon, color: 'bg-yellow-100', textColor: 'text-yellow-600' },
    [OrderStatus.DomesticShipping]: { icon: TruckIcon, color: 'bg-orange-100', textColor: 'text-orange-600' },
    [OrderStatus.Delivered]: { icon: CheckCircleIcon, color: 'bg-green-100', textColor: 'text-green-600' },
    [OrderStatus.Cancelled]: { icon: XCircleIcon, color: 'bg-red-100', textColor: 'text-red-600' },
};

const DashboardSummary: React.FC = () => {
    const { orders } = useData();

    const orderCounts = React.useMemo(() => {
        const counts = {} as Record<OrderStatus, number>;
        for (const status of Object.values(OrderStatus)) {
            counts[status] = 0;
        }
        for (const order of orders) {
            counts[order.status]++;
        }
        return counts;
    }, [orders]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.entries(orderCounts).map(([status, count]) => {
                const info = statusInfo[status as OrderStatus];
                if (!info) return null;
                const Icon = info.icon;
                
                return (
                    <div key={status} className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4 transition-transform hover:scale-105">
                        <div className={`p-3 rounded-full ${info.color}`}>
                            <Icon className={`w-7 h-7 ${info.textColor}`} />
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm font-medium">{status}</p>
                            <p className="text-3xl font-bold text-gray-800">{count}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DashboardSummary;