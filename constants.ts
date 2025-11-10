
import { User, UserRole, Order, OrderStatus, Printer, ShippingCompany, Payment, HoursLog, Bonus } from './types';

export const USERS: User[] = [
  { id: 'user-1', name: 'Admin Ali', email: 'admin@story.com', password: '123456', phone: '1234567890', role: UserRole.Admin },
  { id: 'user-2', name: 'Sales Samira', email: 'sales@story.com', password: '123456', phone: '1234567890', role: UserRole.Sales, hourlyRate: 20 },
  { id: 'user-3', name: 'Designer Dina', email: 'designer@story.com', password: '123456', phone: '1234567890', role: UserRole.Designer },
  { id: 'user-4', name: 'Printer Parvin', email: 'printer@story.com', password: '123456', phone: '1234567890', role: UserRole.Printer },
  { id: 'user-5', name: 'Shipping Sherif', email: 'shipping@story.com', password: '123456', phone: '1234567890', role: UserRole.Shipping },
  { id: 'user-6', name: 'Designer Dani', email: 'designer2@story.com', password: '123456', phone: '0987654321', role: UserRole.Designer },
];

export const PRINTERS: Printer[] = [
  { id: 'printer-1', name: 'Cairo Modern Printing' },
  { id: 'printer-2', name: 'Alexandria Press' },
];

export const SHIPPING_COMPANIES: ShippingCompany[] = [
  { id: 'ship-1', name: 'Aramex', type: 'International' },
  { id: 'ship-2', name: 'DHL', type: 'International' },
  { id: 'ship-3', name: 'Bosta', type: 'Domestic' },
  { id: 'ship-4', name: 'Elma3yar', type: 'Domestic' },
];

export const ORDERS: Order[] = [
  {
    id: 'ORD-123456',
    status: OrderStatus.New,
    customer: { name: 'Farah Ahmed', address: '123 Nile St, Cairo', country: 'مصر', phone: '01012345678' },
    story: { details: 'A story about a cat who explores the pyramids.', type: 'Hardcover', copies: 1 },
    price: 250,
    referenceImages: [],
    createdAt: new Date('2023-10-01T10:00:00Z'),
    createdBy: 'user-2',
    activityLog: [{ user: 'Sales Samira', role: UserRole.Sales, action: 'Created Order', timestamp: new Date('2023-10-01T10:00:00Z') }],
  },
  {
    id: 'ORD-789012',
    status: OrderStatus.Designing,
    customer: { name: 'Omar Khaled', address: '456 Sea Ave, Alexandria', country: 'مصر', phone: '01187654321' },
    story: { details: 'A tale of a friendly dolphin in the Red Sea.', type: 'Paperback', copies: 3 },
    price: 600,
    referenceImages: [],
    createdAt: new Date('2023-10-02T12:30:00Z'),
    createdBy: 'user-2',
    assignedToDesigner: 'user-3',
    activityLog: [
        { user: 'Sales Samira', role: UserRole.Sales, action: 'Created Order', timestamp: new Date('2023-10-02T12:30:00Z') },
        { user: 'Admin Ali', role: UserRole.Admin, action: 'Assigned to Designer Dina', timestamp: new Date('2023-10-02T14:00:00Z') },
    ],
  }
];

export const PAYMENTS: Payment[] = [
    { id: 'pay-1', userId: 'user-3', amount: 50, date: new Date('2023-09-30'), notes: 'September advance' },
    { id: 'pay-2', userId: 'user-2', amount: 1000, date: new Date('2023-10-15'), notes: 'October part-payment' }
];

export const HOURS_LOGS: HoursLog[] = [
    { id: 'hl-1', userId: 'user-2', hours: 40, rate: 20, date: new Date('2023-10-07') },
    { id: 'hl-2', userId: 'user-2', hours: 35, rate: 20, date: new Date('2023-10-14') },
];

export const BONUSES: Bonus[] = [
    { id: 'b-1', userId: 'user-2', amount: 100, date: new Date('2023-10-15'), notes: 'Excellent performance' },
];


export const STORY_PRICE = 120; // Price per story for designers/printers

// Added currency conversion rates, assuming order prices are in USD.
export const USD_TO_EGP_RATE = 47.5;
export const USD_TO_LYD_RATE = 4.85;