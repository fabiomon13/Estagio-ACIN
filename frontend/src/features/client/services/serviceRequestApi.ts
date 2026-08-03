import { apiFetch } from '../../../services/api/client';

export type ServiceRequestType = 'assistance' | 'payment_request';

export type ServiceRequest = {
  id: number;
  session_id: number;
  request_type: {
    id: number;
    name: string;
    alias: ServiceRequestType;
    is_high_priority: boolean;
  };
  status: {
    id: number;
    name: string;
    alias: string;
  };
  created_at: string;
  resolved_at: string | null;
};

// Create a new service request
export function createServiceRequest(
  tableCode: string,
  deviceToken: string,
  type: ServiceRequestType,
): Promise<ServiceRequest> {
  return apiFetch<ServiceRequest>(
    `/client/tables/${encodeURIComponent(tableCode)}/service-requests`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': deviceToken,
      },
      body: JSON.stringify({ type }),
    },
  );
}

// Cancel a service request
export function cancelServiceRequest(
  tableCode: string,
  deviceToken: string,
  requestId: number,
): Promise<void> {
  return apiFetch<void>(
    `/client/tables/${encodeURIComponent(tableCode)}/service-requests/${requestId}/cancel`,
    {
      method: 'PATCH',
      headers: { 'X-Device-Token': deviceToken },
    },
  );
}

// Get all service requests for a table
export function getServiceRequests(
  tableCode: string,
  deviceToken: string,
): Promise<ServiceRequest[]> {
  return apiFetch<ServiceRequest[]>(
    `/client/tables/${encodeURIComponent(tableCode)}/service-requests`,
    {
      headers: { 'X-Device-Token': deviceToken },
    },
  );
}
