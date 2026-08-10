import { apiFetch } from '../../../services/api/client';
import type {
  StaffDashboard,
  StaffPaymentPayload,
  StaffPaymentResponse,
  StaffSessionBill,
} from '../types/staff.types';

export type { StaffDashboard } from '../types/staff.types';

export const getStaffDashboard = () => apiFetch<StaffDashboard>('/staff/dashboard');

export const approveSession = (sessionId: number) =>
  apiFetch(`/staff/sessions/${sessionId}/approve`, {
    method: 'POST',
  });

export const deactivateSession = (sessionId: number) =>
  apiFetch(`/staff/sessions/${sessionId}/deactivate`, {
    method: 'PATCH',
  });

export const resolveRequest = (requestId: number) =>
  apiFetch(`/staff/requests/${requestId}/resolve`, {
    method: 'PATCH',
  });

export const markItemAsServed = (itemId: number) =>
  apiFetch(`/staff/orders/items/${itemId}/serve`, {
    method: 'PATCH',
  });

export const registerPayment = (sessionId: number, payment: StaffPaymentPayload) =>
  apiFetch<StaffPaymentResponse>(`/staff/sessions/${sessionId}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payment),
  });

export const getStaffSessionBill = (sessionId: number) =>
  apiFetch<StaffSessionBill>(`/staff/sessions/${sessionId}/bill`);
