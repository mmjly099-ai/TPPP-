export type ImportFileType = 'xlsx' | 'xls' | 'csv' | 'json' | 'zip';

export type DeduplicationMode = 'skip' | 'update' | 'keep_both';

export type TargetEntity =
  | 'customers'
  | 'orders'
  | 'payments'
  | 'expenses'
  | 'accounts'
  | 'purchaseBatches'
  | 'financialTransactions'
  | 'otherReceivables';

export interface TargetFieldDef {
  key: string;
  label: string;
  required?: boolean;
  type: 'string' | 'number' | 'date' | 'select';
  description?: string;
  aliases: string[];
}

export interface FieldMapping {
  fileColumn: string;
  targetEntity: TargetEntity;
  targetField: string; // or '__skip__'
  isAutoMatched: boolean;
  sampleValues: any[];
}

export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export interface ParsedFileData {
  fileName: string;
  fileSize: number;
  fileType: ImportFileType;
  uploadDate: string;
  sheets: ParsedSheet[];
  isTopStoreNative?: boolean;
  rawNativeData?: any;
}

export interface ImportValidationIssue {
  rowNumber: number;
  entity: TargetEntity;
  field?: string;
  value?: any;
  type: 'error' | 'warning' | 'duplicate';
  message: string;
}

export interface ImportPreviewRecord {
  rowNumber: number;
  entity: TargetEntity;
  data: Record<string, any>;
  status: 'ready' | 'review' | 'duplicate' | 'error';
  issueMessage?: string;
  duplicateMatchField?: string;
}

export interface ImportValidationResult {
  totalRows: number;
  readyCount: number;
  reviewCount: number;
  duplicateCount: number;
  errorCount: number;
  entityBreakdown: Record<TargetEntity, number>;
  issues: ImportValidationIssue[];
  previewRecords: ImportPreviewRecord[];
}

export interface ImportCreatedIds {
  customers: number[];
  orders: number[];
  payments: number[];
  expenses: number[];
  accounts: number[];
  purchaseBatches: number[];
  financialTransactions: number[];
  otherReceivables: number[];
}

export interface ImportOperationRecord {
  id: string; // e.g. "IMP-#0001"
  fileName: string;
  fileType: ImportFileType;
  fileSize: number;
  timestamp: string;
  performedBy: string;
  status: 'completed' | 'rolled_back' | 'failed';
  deduplicationMode: DeduplicationMode;
  totalRecords: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  entityCounts: Record<string, number>;
  backupSnapshotId: string;
  createdRecordIds: ImportCreatedIds;
  notes?: string;
}
