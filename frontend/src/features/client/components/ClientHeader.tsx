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
  showBuffet: boolean;
  onChangeView: (view: ClientView) => void;
  onServiceRequest: (type: ServiceRequestType) => void;
  onEditAllergies: () => void;
};

export function ClientHeader({
  tableNumber,
  activeView,
  isDragging,
  indicatorPosition,
  pendingServiceRequest,
  activeServiceRequests,
  serviceRequestMessage,
  showBuffet,
  onChangeView,
  onServiceRequest,
  onEditAllergies,
}: ClientHeaderProps) {
  return (
    <header className="client-header">
      <div className="client-header-inner">
        <LogoIcon className="client-logo" />
        <div className="client-header-actions flex items-center gap-3">
          <div className="client-table-indicator text-right">
            <p className="client-table-label text-[9px] uppercase tracking-[0.18em] text-content-subtle">
              Mesa
            </p>
            <p className="client-table-number font-display text-lg font-bold leading-none">
              {tableNumber}
            </p>
          </div>
          <div className="client-header-service-actions">
            <button
              type="button"
              className="client-header-service-button"
              aria-label="Editar alergias e intolerâncias"
              title="Alergias e intolerâncias"
              onClick={onEditAllergies}
            >
              <span aria-hidden="true">⚠</span>
            </button>
            <button
              type="button"
              className={`client-header-service-button ${
                activeServiceRequests.payment_request !== undefined ? 'is-payment-active' : ''
              }`}
              aria-label="Pedir a conta"
              title="Pedir a conta"
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
              aria-label="Chamar um funcionário"
              title="Chamar um funcionário"
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
        showBuffet={showBuffet}
        onChange={onChangeView}
      />
    </header>
  );
}
