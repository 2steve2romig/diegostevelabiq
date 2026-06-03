export interface LabSummary {
  labId: number; labCompanyCode: string; legalName: string;
  primaryAddress: string; primaryContact: string;
  locationCount: number; primaryStatus: string; createdAtUtc: string;
  sourceLims?: string; accreditationBody?: string; accreditationNumber?: string;
}
export interface LabDetail {
  labId: number; labCompanyCode: string; legalName: string; primaryAddress: string;
  primaryContact: string; accreditationBody: string | null; accreditationNumber: string | null;
  sourceLims: string | null; createdAtUtc: string; locations: LabLocationSummary[];
}
export interface LabLocationSummary {
  locationId: number; labLocationCode: string; address: string;
  timeZone: string; availableFrom: string; status: string;
}
export interface TestCodeSummary {
  testCodeId: number; code: string; currentDescription: string; activeFlag: boolean;
  parameterCount: number; matrix?: string; sampleSize?: string; testCategory?: string;
  parameters: ParameterSummary[];
}
export interface ParameterSummary {
  parameterCodeId: number; code: string; currentDescription: string;
  methodCode: string; methodName: string; defaultUnit: string | null; defaultResultType: string | null;
}
export interface MasterTest {
  testCodeId: number; code: string; currentDescription: string; activeFlag: boolean;
  labId: number; labCode: string;
  matrix: string | null; sampleSize: string | null; testCategory: string | null;
  parameters: ParameterSummary[];
}
export interface MasterAnalyte {
  parameterCodeId: number; code: string; currentDescription: string; labId: number;
  methodCode: string | null; methodName: string | null; defaultUnit: string | null;
  defaultResultType: string | null; activeFlag: boolean; usedInTests: string[]; testCount: number;
}
export interface DescriptionHistoryEntry {
  description: string; effectiveStart: string; effectiveEnd: string | null; isCurrent: boolean;
}
export interface TestCodeHistory { code: string; history: DescriptionHistoryEntry[]; }
export interface CatalogUploadResult {
  success: boolean; totalRows: number; acceptedRows: number; rejectedRows: RejectedRow[];
  testCodesAdded: number; testCodesUpdated: number; parametersAdded: number;
  parametersUpdated: number; associationsAdded: number;
  createdTests: { code: string; description: string; analyteCount: number }[];
}
export interface RejectedRow { rowNumber: number; field: string; rule: string; }
export interface AuditRecord {
  eventId: number; eventType: string; timestampUtc: string; actorId: string; actorRole: string;
  labId: number | null; locationId: number | null; objectType: string; objectId: string | null;
  beforeStateHash: string | null; afterStateHash: string | null; reason: string | null;
}
export interface CreateLabRequest {
  labCompanyCode: string; legalName: string; primaryAddress: string; primaryContact: string;
  accreditationBody?: string; accreditationNumber?: string; sourceLims?: string; reason?: string;
}
export interface CreateLocationRequest {
  labLocationCode: string; address: string; timeZone: string; availableFrom: string;
}
export interface TransitionRequest { targetState: string; reason: string; }
export interface DashboardStats {
  masterTestCount: number; orphanTestCount: number; masterAnalyteCount: number;
  connectedLabCount: number; testParameterBridges: number; labOfferingRows: number;
  recentActivity: { eventType: string; timestampUtc: string; actorId: string; objectType: string; reason: string | null }[];
  labCoverage: { labCompanyCode: string; legalName: string; total: number; covered: number; status: string }[];
}
export interface OfferingRow {
  testCodeId: number; code: string; currentDescription: string; activeFlag: boolean;
  offered: boolean; matrix?: string; sampleSize?: string; testCategory?: string;
}

export interface TestOrder {
  testOrderId: number;
  sureTrendOrderId: string;
  mode: string;
  status: string;
  dispatchedAtUtc: string;
  dispatchedBy: string | null;
  payloadJson: string | null;
  result: TestResult | null;
}

export interface TestResult {
  testResultId: number;
  labSampleCode: string | null;
  receivedAtUtc: string;
  boundAtUtc: string | null;
  status: string;
  analyteCodesMatch: boolean;
  validationNotes: string | null;
}

export interface TransportChannel {
  channelId: number;
  channelType: string;
  isActive: boolean;
  createdAtUtc: string;
  hostingMode: string | null;
  host: string | null;
  port: number | null;
  inboxPath: string | null;
  outboxPath: string | null;
  archivePath: string | null;
  publicKeyFingerprint: string | null;
  endpointUrl: string | null;
  authType: string | null;
  encryptionType: string | null;
  recipientAddress: string | null;
  fileNamingTemplate: string | null;
}

export interface UpsertChannelRequest {
  isActive?: boolean;
  hostingMode?: string;
  host?: string;
  port?: number;
  inboxPath?: string;
  outboxPath?: string;
  archivePath?: string;
  publicKeyFingerprint?: string;
  endpointUrl?: string;
  authType?: string;
  encryptionType?: string;
  recipientAddress?: string;
  fileNamingTemplate?: string;
  reason?: string;
}
