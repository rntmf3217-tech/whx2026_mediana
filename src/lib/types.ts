export type InquiryType = 
  | "Product & Purchasing Inquiry"
  | "Distribution Partnership Discussion"
  | "ODM/OEM/SKD Partnership Discussion"
  | "Other Agenda";

export type ProductInterest = 
  | "Monitor Defibrillators"
  | "Patient Monitors"
  | "AEDs"
  | "Others";

export interface Booking {
  id: string;
  name: string;
  email: string;
  companyName: string;
  country: string;
  productInterest: ProductInterest;
  inquiryType: InquiryType;
  message?: string;
  customerType?: "new" | "existing";
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  createdAt: string;
  statusFlag?: 'new' | 'updated' | 'read';
}

export interface Notification {
  id: string;
  bookingId: string | null;
  message: string;
  createdAt: string;
  isRead: boolean;
  actionType: 'create' | 'update' | 'cancel';
}
