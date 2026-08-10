import type { ClientOrder, OrderStatusAlias } from '../../services/orderApi';

const ORDER_PROGRESS = [
  'pending',
  'preparing',
  'ready',
  'served',
] as const satisfies readonly OrderStatusAlias[];

const ORDER_PROGRESS_LABELS = ['Recebido', 'Em preparação', 'Pronto', 'Servido'] as const;

const TERMINAL_STATUS_LABELS: Partial<Record<OrderStatusAlias, string>> = {
  cancelled: 'Cancelado',
  returned: 'Devolvido',
};

type OrderItem = ClientOrder['items'][number];

type OrderProgressCardProps = {
  item: OrderItem;
  isCancelling: boolean;
  onCancel: () => Promise<void>;
};

export function OrderProgressCard({ item, isCancelling, onCancel }: OrderProgressCardProps) {
  const statusIndex = ORDER_PROGRESS.indexOf(item.status.alias as (typeof ORDER_PROGRESS)[number]);

  const terminalStatusLabel = TERMINAL_STATUS_LABELS[item.status.alias];

  return (
    <article
      className={['client-order-card', terminalStatusLabel ? 'is-cancelled' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <header>
        <strong>
          {item.menu_item.name}
          {item.quantity > 1 ? ` × ${item.quantity}` : ''}
        </strong>

        {item.status.alias === 'pending' && (
          <button
            type="button"
            disabled={isCancelling}
            aria-label={`Cancelar ${item.menu_item.name}`}
            onClick={() => void onCancel()}
          >
            {isCancelling ? '…' : '×'}
          </button>
        )}
      </header>

      {terminalStatusLabel ? (
        <p className="client-order-cancelled">{terminalStatusLabel}</p>
      ) : (
        <div className="client-order-progress">
          <div
            className="client-order-progress-line"
            data-progress={Math.max(statusIndex, 0)}
            aria-hidden="true"
          >
            {ORDER_PROGRESS.map((status, index) => (
              <span
                key={status}
                className={index <= statusIndex ? `is-complete status-${status}` : ''}
              />
            ))}
          </div>

          <p className="sr-only" aria-live="polite">
            Estado atual: {statusIndex >= 0 ? ORDER_PROGRESS_LABELS[statusIndex] : item.status.name}
          </p>

          <div className="client-order-progress-labels">
            {ORDER_PROGRESS_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
