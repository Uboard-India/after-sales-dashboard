export interface ComplaintRow {
  sequenceNo: string;
  complaintDate: string;
  monthYear: string;
  requestBy: string;
  customerName: string;
  customerMobile: string;
  brand: string;
  productName: string;
  platform: string;
  complaintType: string;
  warrantyStatus: string;
  issueType: string;
  actionTaken: string;
  serviceCenter: string;
  headRemarks: string;
  uboardRemarks: string;
  paymentType: string;
  closeDate: string;
  daysPending: number | null;
  ageingDays: string;
  isOpen: boolean;
}

export interface ApiResponse {
  rows: ComplaintRow[];
  lastUpdated: string;
  error?: string;
}
