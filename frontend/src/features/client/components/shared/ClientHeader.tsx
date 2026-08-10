import LogoIcon from '../../../../components/icons/Logo';
import type { ClientView } from '../../clientTypes';
import type { ServiceRequestType } from '../../services/serviceRequestApi';
import { ClientNavigation } from './ClientNavigation';

type ActiveServiceRequests = Readonly<Partial<Record<ServiceRequestType, number>>>;

type ClientHeaderProps = {
  tableNumber?: number;
  activeView: ClientView;
  isDragging: boolean;
  indicatorPosition: number;
  pendingServiceRequest: ServiceRequestType | null;
  activeServiceRequests: ActiveServiceRequests;
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
  const isPaymentRequestActive = activeServiceRequests.payment_request !== undefined;

  const isAssistanceRequestActive = activeServiceRequests.assistance !== undefined;

  const serviceActionsDisabled = pendingServiceRequest !== null;

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
              {tableNumber ?? '—'}
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
              className={[
                'client-header-service-button',
                isPaymentRequestActive ? 'is-payment-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={serviceActionsDisabled}
              aria-label={isPaymentRequestActive ? 'Cancelar pedido de conta' : 'Pedir a conta'}
              title={isPaymentRequestActive ? 'Cancelar pedido de conta' : 'Pedir a conta'}
              aria-pressed={isPaymentRequestActive}
              onClick={() => onServiceRequest('payment_request')}
            >
              <span aria-hidden="true">💳</span>
            </button>

            <button
              type="button"
              className={[
                'client-header-service-button',
                isAssistanceRequestActive ? 'is-assistance-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={serviceActionsDisabled}
              aria-label={
                isAssistanceRequestActive
                  ? 'Cancelar pedido de assistência'
                  : 'Chamar um funcionário'
              }
              title={
                isAssistanceRequestActive
                  ? 'Cancelar pedido de assistência'
                  : 'Chamar um funcionário'
              }
              aria-pressed={isAssistanceRequestActive}
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
