export type PropertyType =
  | "office"
  | "retail"
  | "warehouse"
  | "industrial"
  | "mixed_use"
  | "other";

export type RealEstateCategory =
  | "all"
  | "commercial"
  | "residential"
  | "industrial"
  | "retail"
  | "warehouse"
  | "land"
  | "co-working";

export type OccupancyStatus = "fully_occupied" | "partially_occupied" | "vacant";

export type PropertyLifecycleStage =
  | "acquired"
  | "stabilizing"
  | "operational"
  | "value_add"
  | "exit_ready";

export type TenantStatus = "active" | "inactive";

export type LeaseStatus = "active" | "expiring" | "expired" | "renewed" | "terminated";

export type RentPaymentStatus = "paid" | "pending" | "overdue";

export type MaintenanceStatus = "open" | "in_progress" | "resolved" | "closed";

export type PropertyDocumentCategory =
  | "agreements"
  | "invoices"
  | "tax_docs"
  | "maintenance_bills"
  | "property_photos";

export interface PropertyDocument {
  id: number;
  category: PropertyDocumentCategory;
  title: string;
  url?: string;
  createdAt?: string;
}

export interface PropertyFinancials {
  rentReceived: number;
  pendingRent: number;
  maintenanceExpenses: number;
  propertyTax: number;
  insurance: number;
  monthlyCashflow: number;
  yearlyPerformance: number;
  noi: number;
}

export interface PropertySummary {
  id: number;
  name: string;
  type: PropertyType;
  address: string;
  occupancyStatus: OccupancyStatus;
  lifecycleStage: PropertyLifecycleStage;
  purchaseValue: number;
  currentValue: number;
  roiPercent: number;
  rentalYieldPercent: number;
  noi: number;
  tenantStatus: string;
}

export interface PropertyDetail extends PropertySummary {
  tenantCount: number;
  leasedUnits: number;
  totalUnits: number;
  financials: PropertyFinancials;
  documents: PropertyDocument[];
  photos: Array<{ id: number; src: string; alt: string }>;
}

export interface TenantCompanyDetails {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry?: string;
}

export interface EscalationScheduleItem {
  effectiveDate: string;
  increasePercent: number;
}

export interface TenantComplaint {
  id: number;
  title: string;
  status: MaintenanceStatus;
  createdAt: string;
}

export interface TenantPaymentItem {
  id: number;
  month: string;
  amount: number;
  status: RentPaymentStatus;
  paidOn?: string;
}

export interface TenantHistoryEvent {
  id: number;
  label: string;
  at: string;
  note?: string;
}

export interface TenantSummary {
  id: number;
  propertyId: number;
  leaseId?: number;
  status: TenantStatus;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  rentAmount: number;
  leaseStartDate: string;
  leaseEndDate: string;
}

export interface TenantDetail extends TenantSummary {
  escalationSchedule: EscalationScheduleItem[];
  depositAmount: number;
  complaints: TenantComplaint[];
  paymentHistory: TenantPaymentItem[];
  history: TenantHistoryEvent[];
}

export interface LeaseSummary {
  id: number;
  propertyId: number;
  tenantId: number;
  status: LeaseStatus;
  startDate: string;
  endDate: string;
  lockInMonths: number;
  rentAmount: number;
  escalationPercent: number;
  renewalReminderDays: number;
}

export interface LeaseTimelineEvent {
  id: number;
  label: string;
  at: string;
  status?: LeaseStatus;
}

export interface LeaseDetail extends LeaseSummary {
  timeline: LeaseTimelineEvent[];
  countdownDays: number;
}

export interface RentLedgerItem {
  id: number;
  propertyId: number;
  tenantId: number;
  leaseId?: number;
  dueDate: string;
  month: string;
  amount: number;
  status: RentPaymentStatus;
  paidAt?: string;
  receiptNumber?: string;
}

export interface RentSummary {
  rentCollected: number;
  pendingRent: number;
  overdueRent: number;
  occupancyPercent: number;
  yieldPercent: number;
  noi: number;
}

export interface MaintenanceTicket {
  id: number;
  propertyId: number;
  tenantId?: number;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: "low" | "medium" | "high";
  vendor?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkOrderTimelineEvent {
  id: number;
  ticketId: number;
  label: string;
  at: string;
  status: MaintenanceStatus;
}

export interface OwnerAnalytics {
  occupancyTrend: Array<{ label: string; value: number }>;
  rentTrend: Array<{ label: string; value: number }>;
  occupancyGraph: Array<{ label: string; value: number }>;
  expenseBreakdown: Array<{ label: string; value: number }>;
  noiGrowth: Array<{ label: string; value: number }>;
  leaseExpiryAlerts: number;
  propertyRoiPercent: number;
  maintenanceCosts: number;
  cashflowForecast: Array<{ label: string; value: number }>;
  rentalYieldPercent: number;
}

export interface RealEstateDashboardData {
  properties: PropertySummary[];
  tenants: TenantSummary[];
  leases: LeaseSummary[];
  rentLedger: RentLedgerItem[];
  maintenanceTickets: MaintenanceTicket[];
  rentSummary: RentSummary;
  analytics: OwnerAnalytics;
}
