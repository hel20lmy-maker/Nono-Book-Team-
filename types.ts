
export enum UserRole {
  Admin = 'Admin',
  Sales = 'Sales',
  Designer = 'Designer',
  Printer = 'Printer',
  Shipping = 'Shipping',
}

export enum OrderStatus {
  New = 'New Order',
  Designing = 'Designing',
  Printing = 'Printing',
  InternationalShipping = 'International Shipping',
  DomesticShipping = 'Domestic Shipping',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Re-added for local auth
  phone: string;
  role: UserRole;
  hourlyRate?: number; // For sales
  storyRate?: number; // For designers
}

export interface Customer {
  name: string;
  address: string;
  country: string;
  phone: string;
  altPhone?: string;
}

export interface StoryDetails {
  ownerName?: string;
  details: string;
  type: string;
  copies: number;
}

export interface ActivityLogEntry {
  user: string;
  role: UserRole;
  action: string;
  timestamp: Date;
  details?: string;
  file?: { name: string; url: string };
}

export interface ShippingInfo {
  company: string;
  trackingNumber: string;
  date: Date;
}

export interface Order {
  id: string;
  status: OrderStatus;
  customer: Customer;
  story: StoryDetails;
  price: number;
  referenceImages: { name: string; url: string }[];
  finalPdf?: { name: string; url: string };
  coverImage?: { name: string; url: string };
  createdAt: Date;
  createdBy: string; // User ID
  assignedToDesigner?: string; // User ID
  assignedToPrinter?: string; // Printer ID
  internationalShippingInfo?: ShippingInfo;
  domesticShippingInfo?: ShippingInfo;
  deliveryDate?: Date;
  activityLog: ActivityLogEntry[];
}

export interface Printer {
  id: string;
  name: string;
  storyRate?: number;
}

export interface ShippingCompany {
  id: string;
  name: string;
  type: 'International' | 'Domestic';
}

export interface Payment {
  id: string;
  userId?: string;
  printerId?: string;
  amount: number;
  date: Date;
  notes?: string;
}

export interface HoursLog {
  id: string;
  userId: string;
  hours: number;
  rate: number; // The rate at the time of logging
  date: Date;
}

export interface Bonus {
  id: string;
  userId: string;
  amount: number;
  date: Date;
  notes?: string;
}