export interface LabSummary {
  labId: number;
  labCompanyCode: string;
  legalName: string;
  primaryContact: string;
  locationCount: number;
  primaryStatus: string;
  createdAtUtc: string;
}

export interface LabDetail {
  labId: number;
  labCompanyCode: string;
  legalName: string;
  primaryAddress: string;
  primaryContact: string;
  accreditationBody: string | null;
  accreditationNumber: string | null;
  createdAtUtc: string;
  locations: LabLocationSummary[];
}

export interface LabLocationSummary {
  locationId: number;
  labLocationCode: string;
  address: string;
  timeZone: string;
  availableFrom: string;
  status: string;
}

export interface TestCodeSummary {
  testCodeId: number;
  code: string;
  currentDescription: string;
  activeFlag: boolean;
  parameterCount: number;
  parameters: ParameterSummary[];
}

export interface ParameterSummary {
  parameterCodeId: number;
  code: string;
  currentDescription: string;
  methodCode: string;
  methodName: string;
  defaultUnit: string | null;
  defaultResultType: string | null;
}

export interface MasterTest {
  testCodeId: number;
  code: string;
  currentDescription: string;
  activeFlag: boolean;
  labId: number;
  labCode: string;
  parameters: ParameterSummary[];
}

export interface MasterAnalyte {
  parameterCodeId: number;
  code: string;
  currentDescription: string;
  labId: number;
  methodCode: string | null;
  methodName: string | null;
  defaultUnit: string | null;
  defaultResultType: string | null;
  activeFlag: boolean;
  usedInTests: string[];
  testCount: number;
}

export interface DescriptionHistoryEntry {
  description: string;
  effectiveStart: string;
  effectiveEnd: string | null;
  isCurrent: boolean;
}

export interface TestCodeHistory {
  code: string;
  history: DescriptionHistoryEntry[];
}

export interface CatalogUploadResult {
  success: boolean;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: RejectedRow[];
  testCodesAdded: number;
  testCodesUpdated: number;
  parametersAdded: number;
  parametersUpdated: number;
  associationsAdded: number;
}

export interface RejectedRow {
  rowNumber: number;
  field: string;
  rule: string;
}

export interface AuditEventRecord {
  eventId: number;
  eventType: string;
  timestampUtc: string;
  actorId: string;
  actorRole: string;
  objectType: string;
  objectId: string | null;
  reason: string | null;
}

export interface CreateLabRequest {
  labCompanyCode: string;
  legalName: string;
  primaryAddress: string;
  primaryContact: string;
  accreditationBody?: string;
  accreditationNumber?: string;
  reason?: string;
}

export interface CreateLocationRequest {
  labLocationCode: string;
  address: string;
  timeZone: string;
  availableFrom: string;
}

export interface TransitionRequest {
  targetState: string;
  reason: string;
}

export interface DashboardStats {
  masterTestCount: number;
  orphanTestCount: number;
  masterAnalyteCount: number;
  connectedLabCount: number;
  testParameterBridges: number;
  labOfferingRows: number;
  recentActivity: { eventType: string; timestampUtc: string; actorId: string; objectType: string; reason: string | null }[];
  labCoverage: { labCompanyCode: string; legalName: string; total: number; covered: number; status: string }[];
}

export interface OfferingRow {
  testCodeId: number;
  code: string;
  currentDescription: string;
  activeFlag: boolean;
  offered: boolean;
}
