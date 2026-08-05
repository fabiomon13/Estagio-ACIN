import { apiFetch } from '../../../services/api/client';

export type StaffTableState = 'awaiting_approval' | 'active' | 'inactive' | 'payment_requested';
export type StaffRequestType = 'assistance' | 'payment_request' | string;
export type StaffPriority = 'normal' | 'urgent' | string;

export type StaffDashboard = {
  summary: { occupied_tables: number; guest_count: number; open_requests: number };
  tables: Array<{
    session_id: number;
    table_number: number;
    guest_count: number;
    state: StaffTableState;
    started_at: string | null;
    ready_item_count: number;
    total: string;
    waiter_name?: string | null;
  }>;
  ready_to_serve: Array<{
    table_number: number;
    items: Array<{ id: number; name: string; quantity: number }>;
  }>;
  requests: Array<{
    id: number;
    table_number: number;
    type: StaffRequestType;
    priority: StaffPriority;
    created_at: string;
  }>;
};

export const getStaffDashboard = () => apiFetch<StaffDashboard>('/staff/dashboard');
export const approveSession = (sessionId: number) =>
  apiFetch(`/staff/sessions/${sessionId}/approve`, { method: 'POST' });
export const deactivateSession = (sessionId: number) =>
  apiFetch(`/staff/sessions/${sessionId}/deactivate`, { method: 'PATCH' });
export const resolveRequest = (requestId: number) =>
  apiFetch(`/staff/requests/${requestId}/resolve`, { method: 'PATCH' });
export const markItemAsServed = (itemId: number) =>
  apiFetch(`/staff/orders/items/${itemId}/serve`, { method: 'PATCH' });
