import { apiFetch } from '../../../services/api/client';

export type ServiceRequestType = 'assistance' | 'payment_request';

type ServiceRequest = {
  id: number;
  session_id: number;
  created_at: string;
  resolved_at: string | null;
};

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
