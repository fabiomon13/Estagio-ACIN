import { apiFetch } from '../../../services/api/client';

export type StaffDashboardSummary = {
  occupied_tables: number;
  guest_count: number;
  open_requests: number;
};

export type StaffDashboardTable = {
  session_id: number;
  table_number: number;
  guest_count: number;
  state: 'awaiting_approval' | 'active' | 'inactive' | 'payment_requested';
  started_at: string | null;
  ready_item_count: number;
  total: string;
};

export type StaffOpenRequest = {
  id: number;
  table_number: number;
  type: 'assistance' | 'payment_request' | string;
  priority: 'normal' | 'urgent' | string;
  created_at: string;
};

export type StaffDashboard = {
  summary: StaffDashboardSummary;
  tables: StaffDashboardTable[];
  ready_to_serve: Array<{
    table_number: number;
    items: Array<{ id: number; name: string; quantity: number }>;
  }>;
  requests: StaffOpenRequest[];
};

export async function getStaffDashboard() {
  return apiFetch<StaffDashboard>('/staff/dashboard');
}

export async function getStaffRequests(limit = 50, offset = 0) {
  return apiFetch<{ success: boolean; count: number; items: StaffOpenRequest[] }>(
    `/staff/requests?limit=${limit}&offset=${offset}`,
  );
}

export async function getStaffSession(sessionId: number) {
  return apiFetch(`/staff/sessions/${sessionId}`);
}

export async function approveSession(sessionId: number) {
  return apiFetch(`/staff/sessions/${sessionId}/approve`, { method: 'POST' });
}

export async function deactivateSession(sessionId: number) {
  return apiFetch(`/staff/sessions/${sessionId}/deactivate`, { method: 'PATCH' });
}

export async function resolveRequest(requestId: number) {
  return apiFetch(`/staff/requests/${requestId}/resolve`, { method: 'PATCH' });
}
