export type DocType = 'MEMORANDUM' | 'OFICIO' | 'OFICIO_MULTIPLE';

export type DocStatus =
  | 'BORRADOR'
  | 'REGISTRADO'
  | 'ENVIADO'
  | 'RECIBIDO'
  | 'ATENDIDO'
  | 'OBSERVADO'
  | 'ANULADO'
  | 'CANCELADO';

export type UserRole = 'ADMINISTRADOR' | 'USUARIO';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVO' | 'INACTIVO';
  lastLoginAt?: string;
  created_at?: string;
}

export interface Recipient {
  id: number;
  name: string;
  acronym: string;
  boss_name: string;
  boss_position: string;
  status: 'ACTIVO' | 'INACTIVO';
  created_at: string;
  updated_at: string;
}

export interface DocumentRecipient {
  id: number;
  document_id: number;
  recipient_id: number;
  recipient_name: string;
  recipient_acronym: string;
  boss_name: string;
  boss_position: string;
}

export interface DocumentItem {
  id: number;
  doc_type: DocType;
  year: number;
  number: number;
  formatted_number: string;
  date: string;
  subject: string;
  description: string;
  status: DocStatus;
  user_id: number;
  user_name: string;
  observations?: string;
  lot_id?: number;
  lot_code?: string;
  authorization_id?: number;
  authorization_code?: string;
  recipients_text?: string;
  bosses_text?: string;
  recipient_count?: number;
  variable_data?: string;
  created_at: string;
  updated_at: string;
}

export interface NumberingOverviewItem {
  docType: DocType;
  year: number;
  lastNumber: number;
  nextNumber: number;
  formattedNext: string;
  usedCount: number;
  reservedCount: number;
  releasedCount: number;
}

export interface NumberReservation {
  id: number;
  doc_type: DocType;
  year: number;
  number: number;
  formatted_number: string;
  user_id: number;
  user_name: string;
  status: 'RESERVADO' | 'UTILIZADO' | 'LIBERADO' | 'EXPIRADO';
  reserved_at: string;
  expires_at: string;
  released_at?: string;
  released_by_user_name?: string;
  release_reason?: string;
  document_id?: number;
}

export interface AuthorizationItem {
  id: number;
  code: string;
  date: string;
  operation_type: string;
  subject: string;
  description: string;
  authorizing_area: string;
  authorizing_boss: string;
  user_id: number;
  user_name: string;
  authorized_qty: number;
  used_qty: number;
  available_qty: number;
  status: 'PENDIENTE' | 'AUTORIZADA' | 'UTILIZADA' | 'CANCELADA';
  created_at: string;
  updated_at: string;
}

export interface BulkLot {
  id: number;
  code: string;
  date: string;
  user_id: number;
  user_name: string;
  operation_type: string;
  authorization_id?: number;
  authorization_code?: string;
  quantity: number;
  subject: string;
  description: string;
  recipients_summary: string;
  distribution_mode: 'SINGLE' | 'EQUAL_PER_RECIPIENT' | 'TOTAL_DISTRIBUTED';
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  document_number?: string;
  doc_type?: string;
  year?: number;
  lot_code?: string;
  old_values?: string;
  new_values?: string;
  reason?: string;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  currentYear: number;
  todayStr: string;
  totalDocuments: number;
  totalMemorandums: number;
  totalOficios: number;
  totalOficiosMultiples: number;
  registeredToday: number;
  registeredThisMonth: number;
  registeredThisYear: number;
  totalLots: number;
  byStatus: { status: string; count: number }[];
  byUser: { user_name: string; count: number }[];
  byRecipient: { recipient_name: string; count: number }[];
  numberingSummary: {
    reservedCount: number;
    usedCount: number;
    releasedCount: number;
  };
}
