import LogoIcon from '../../../components/icons/Logo';
import type { ClientView } from '../clientTypes';
import type { ServiceRequestType } from '../services/serviceRequestApi';
import { ClientNavigation } from './ClientNavigation';

type ClientHeaderProps = {
  tableNumber?: number;
  activeView: ClientView;
  isDragging: boolean;
  indicatorPosition: number;
  pendingServiceRequest: ServiceRequestType | null;
  activeServiceRequests: Partial<Record<ServiceRequestType, number>>;
  serviceRequestMessage?: string | null;
  onChangeView: (view: ClientView) => void;
  onServiceRequest: (type: ServiceRequestType) => void;
};

export function ClientHeader({
  tableNumber,
  activeView,
  isDragging,
  indicatorPosition,
  pendingServiceRequest,
  activeServiceRequests,
  serviceRequestMessage,
  onChangeView,
  onServiceRequest,
}: ClientHeaderProps) {
  return (
    <header className="client-header">
      <div className="client-header-inner">
        <LogoIcon className="client-logo" />
        <div className="client-header-actions flex items-center gap-3">
          <div className="client-table-indicator text-right">
            <p className="client-table-label text-[9px] uppercase tracking-[0.18em] text-content-subtle">
              Table
            </p>
            <p className="client-table-number font-display text-lg font-bold leading-none">
              {tableNumber}
            </p>
          </div>
          <div className="client-header-service-actions">
            <button
              type="button"
              className={`client-header-service-button ${
                activeServiceRequests.payment_request !== undefined ? 'is-payment-active' : ''
              }`}
              aria-label="Request the bill"
              title="Request the bill"
              disabled={pendingServiceRequest !== null}
              aria-pressed={activeServiceRequests.payment_request !== undefined}
              onClick={() => onServiceRequest('payment_request')}
            >
              <span aria-hidden="true">💳</span>
            </button>
            <button
              type="button"
              className={`client-header-service-button ${
                activeServiceRequests.assistance !== undefined ? 'is-assistance-active' : ''
              }`}
              aria-label="Call staff"
              title="Call staff"
              disabled={pendingServiceRequest !== null}
              aria-pressed={activeServiceRequests.assistance !== undefined}
              onClick={() => onServiceRequest('assistance')}
            >
              <span aria-hidden="true">?</span>
            </button>
          </div>
        </div>
      </div>
      {serviceRequestMessage && (
        <p className="sr-only" role="status">
          {serviceRequestMessage}
        </p>
      )}
      <ClientNavigation
        activeView={activeView}
        isDragging={isDragging}
        indicatorPosition={indicatorPosition}
        onChange={onChangeView}
      />
    </header>
  );
}
