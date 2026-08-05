import { useCallback, useEffect, useState } from 'react';

import { useToast } from '../../../components/ui/toast/useToast';
import { ApiError } from '../../../services/api/client';
import {
  cancelServiceRequest,
  createServiceRequest,
  getServiceRequests,
  type ServiceRequestType,
} from '../services/serviceRequestApi';
import { getDeviceToken } from '../utils/deviceToken';

type UseClientServiceRequestsOptions = {
  tableCode?: string;
  enabled: boolean;
};

export function useClientServiceRequests({ tableCode, enabled }: UseClientServiceRequestsOptions) {
  const { showToast } = useToast();
  const [pendingRequest, setPendingRequest] = useState<ServiceRequestType | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [activeRequests, setActiveRequests] = useState<Partial<Record<ServiceRequestType, number>>>(
    {},
  );

  useEffect(() => {
    if (!enabled || !tableCode) return;

    let isActive = true;
    let isLoading = false;
    let controller: AbortController | null = null;

    const loadRequests = async () => {
      if (isLoading) return;
      isLoading = true;
      controller = new AbortController();
      try {
        const requests = await getServiceRequests(tableCode, getDeviceToken(), {
          signal: controller.signal,
        });
        if (!isActive) return;
        const next: Partial<Record<ServiceRequestType, number>> = {};
        for (const request of requests) {
          if (request.resolved_at === null && request.status.alias === 'pending') {
            next[request.request_type.alias] = request.id;
          }
        }
        setActiveRequests(next);
        setPollingError(null);
      } catch (error) {
        if (isActive && !(error instanceof DOMException && error.name === 'AbortError')) {
          setPollingError('Service request status could not be refreshed. Retrying…');
        }
      } finally {
        isLoading = false;
      }
    };

    void loadRequests();
    const timer = window.setInterval(loadRequests, 5000);
    return () => {
      isActive = false;
      controller?.abort();
      window.clearInterval(timer);
    };
  }, [enabled, tableCode]);

  const toggleRequest = useCallback(
    async (type: ServiceRequestType) => {
      if (!tableCode || pendingRequest) return;
      setPendingRequest(type);
      try {
        const requestId = activeRequests[type];
        if (requestId !== undefined) {
          await cancelServiceRequest(tableCode, getDeviceToken(), requestId);
          setActiveRequests((current) => {
            const next = { ...current };
            delete next[type];
            return next;
          });
          showToast({
            title: type === 'payment_request' ? 'Bill request cancelled' : 'Assistance cancelled',
            description: 'The request was cancelled.',
            variant: 'default',
          });
        } else {
          const request = await createServiceRequest(tableCode, getDeviceToken(), type);
          setActiveRequests((current) => ({ ...current, [type]: request.id }));
          showToast({
            title: type === 'payment_request' ? 'Bill requested' : 'Staff called',
            description: 'The request was sent to the staff.',
            variant: 'success',
          });
        }
      } catch (error) {
        showToast({
          title: 'The request could not be sent',
          description: error instanceof ApiError ? error.detail : 'Please try again.',
          variant: 'danger',
        });
      } finally {
        setPendingRequest(null);
      }
    },
    [activeRequests, pendingRequest, showToast, tableCode],
  );

  return { activeRequests, pendingRequest, pollingError, toggleRequest };
}
