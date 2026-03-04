
export enum AppView {
  LOGIN = 'LOGIN',
  WELCOME = 'WELCOME',
  DASHBOARD = 'DASHBOARD',
  MINUTA = 'MINUTA',
  SETTINGS = 'SETTINGS',
  VISITOR_FORM = 'VISITOR_FORM',
  INCIDENT_FORM = 'INCIDENT_FORM',
  ROUND_FORM = 'ROUND_FORM',
  PACKAGE_FORM = 'PACKAGE_FORM',
  FACTURA_BATCH_FORM = 'FACTURA_BATCH_FORM',
  FACTURA_ENTREGA_FORM = 'FACTURA_ENTREGA_FORM',
  ENCOMIENDAS_HUB = 'ENCOMIENDAS_HUB',
  CONFIRMATION = 'CONFIRMATION',
  ADMIN = 'ADMIN'
}

export enum EventType {
  VISITOR = 'VISITOR',
  INCIDENT = 'INCIDENT',
  ROUND = 'ROUND',
  DELIVERY = 'DELIVERY',
  SERVICE = 'SERVICE',
  PROVEEDOR = 'PROVEEDOR',
  INFO = 'INFO',
  FACTURA = 'FACTURA',
  ENCOMIENDA = 'ENCOMIENDA'
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  occurredAt: Date;
  type: EventType;
  title: string;
  subtitle: string;
  description?: string;
  imageUrl?: string;
  status: 'ABIERTO' | 'CERRADO';
  details: any;
  document_id?: string;
  critical_level?: 'BAJA' | 'MEDIA' | 'ALTA';
  signature_url?: string;
}

export interface User {
  name: string;
  id: string;
  location: string;
  turn: string;
  avatarUrl: string;
  role: 'GUARD' | 'ADMIN' | 'COORDINATOR';
  entity_id?: string;
  document_id?: string;
}

export interface Entity {
  id: string;
  name: string;
  address?: string;
  description?: string;
  created_at: string;
}

export interface Shift {
  id: string;
  user_id: string;
  entity_id: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

export interface NexusConfig {
  id: string;
  entity_id: string;
  nexus_endpoint: string;
  api_key: string;
  is_active: boolean;
  last_sync_at?: string;
  last_error?: string;
}
