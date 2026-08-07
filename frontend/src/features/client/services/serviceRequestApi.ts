import { apiFetch } from '../../../services/api/client';
import { buildClientTablePath, createDeviceHeaders } from './clientRequest';

export type ServiceRequestType = 'assistance' | 'payment_request';
export type ServiceRequestStatus = 'pending' | 'resolved' | 'cancelled';

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
    alias: ServiceRequestStatus;
  };
  created_at: string;
  resolved_at: string | null;
};

export type ServiceRequestOptions = { signal?: AbortSignal };

// Create a new service request
export function createServiceRequest(
  tableCode: string,
  deviceToken: string,
  type: ServiceRequestType,
  options: ServiceRequestOptions = {},
): Promise<ServiceRequest> {
  return apiFetch<ServiceRequest>(`${buildClientTablePath(tableCode)}/service-requests`, {
    method: 'POST',
    headers: createDeviceHeaders(deviceToken, {
      includeJson: true,
    }),
    body: JSON.stringify({ type }),
    signal: options.signal,
  });
}

// Cancel a service request
export function cancelServiceRequest(
  tableCode: string,
  deviceToken: string,
  requestId: number,
  options: ServiceRequestOptions = {},
): Promise<void> {
  return apiFetch<void>(`${buildClientTablePath(tableCode)}/service-requests/${requestId}/cancel`, {
    method: 'PATCH',
    headers: createDeviceHeaders(deviceToken),
    signal: options.signal,
  });
}

// Get all service requests for a table
export function getServiceRequests(
  tableCode: string,
  deviceToken: string,
  options: ServiceRequestOptions = {},
): Promise<ServiceRequest[]> {
  return apiFetch<ServiceRequest[]>(`${buildClientTablePath(tableCode)}/service-requests`, {
    headers: createDeviceHeaders(deviceToken),
    signal: options.signal,
  });
}
