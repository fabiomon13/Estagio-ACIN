import { useState } from 'react';

import type { ClientOrder } from '../services/orderApi';

const orderProgress = ['pending', 'preparing', 'ready', 'served'] as const;
const orderProgressLabels = ['Recebido', 'Em preparação', 'Pronto', 'Servido'];
const orderTimeFormatter = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
});

type OrdersViewProps = {
  orders: ClientOrder[];
  onCancel: (orderId: number, itemId: number) => Promise<void>;
  refreshMessage?: string | null;
};

export function OrdersView({ orders, onCancel, refreshMessage }: OrdersViewProps) {
  const [ordersTab, setOrdersTab] = useState<'active' | 'history'>('active');
  const [pendingCancellationId, setPendingCancellationId] = useState<number | null>(null);
  const visibleOrders = orders.filter((order) => {
    const isFinished =
      order.items.length > 0 &&
      order.items.every((item) => ['served', 'cancelled', 'returned'].includes(item.status.alias));
    return ordersTab === 'history' ? isFinished : !isFinished;
  });

  return (
    <div className="client-orders mx-auto max-w-lg px-4 pb-10">
      <div className="client-orders-tabs" role="tablist" aria-label="Estado dos pedidos">
        <button
          type="button"
          className={ordersTab === 'active' ? 'is-active' : ''}
          role="tab"
          aria-selected={ordersTab === 'active'}
          onClick={() => setOrdersTab('active')}
        >
          Em curso
        </button>
        <button
          type="button"
          className={ordersTab === 'history' ? 'is-active' : ''}
          role="tab"
          aria-selected={ordersTab === 'history'}
          onClick={() => setOrdersTab('history')}
        >
          Histórico
        </button>
      </div>

      {refreshMessage && (
        <p className="client-orders-refresh-message" role="status">
          {refreshMessage}
        </p>
      )}

      {visibleOrders.length === 0 ? (
        <p className="client-orders-empty">
          {ordersTab === 'active' ? 'Não existem pedidos em curso.' : 'Ainda não existe histórico.'}
        </p>
      ) : (
        visibleOrders.map((order) => (
          <section key={order.id} className="client-order-round">
            <header className="client-order-round-heading">
              <h1>Ronda {order.round_number}</h1>
              <time dateTime={order.created_at}>{formatOrderTime(order.created_at)}</time>
            </header>
            <div className="client-order-items">
              {order.items.map((item) => (
                <OrderProgressCard
                  key={item.id}
                  item={item}
                  isCancelling={pendingCancellationId === item.id}
                  onCancel={async () => {
                    if (pendingCancellationId !== null) return;
                    setPendingCancellationId(item.id);
                    try {
                      await onCancel(order.id, item.id);
                    } finally {
                      setPendingCancellationId(null);
                    }
                  }}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function formatOrderTime(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? '' : orderTimeFormatter.format(date);
}

function OrderProgressCard({
  item,
  onCancel,
  isCancelling,
}: {
  item: ClientOrder['items'][number];
  onCancel: () => Promise<void>;
  isCancelling: boolean;
}) {
  const statusIndex = orderProgress.indexOf(item.status.alias as (typeof orderProgress)[number]);
  const isCancelled = item.status.alias === 'cancelled';

  return (
    <article className={`client-order-card ${isCancelled ? 'is-cancelled' : ''}`}>
      <header>
        <strong>
          {item.menu_item.name}
          {item.quantity > 1 ? ` × ${item.quantity}` : ''}
        </strong>
        {item.status.alias === 'pending' && (
          <button
            type="button"
            onClick={() => void onCancel()}
            disabled={isCancelling}
            aria-label={`Cancelar ${item.menu_item.name}`}
          >
            {isCancelling ? '…' : '×'}
          </button>
        )}
      </header>

      {isCancelled ? (
        <p className="client-order-cancelled">Cancelado</p>
      ) : (
        <div className="client-order-progress">
          <div
            className="client-order-progress-line"
            data-progress={Math.max(statusIndex, 0)}
            aria-hidden="true"
          >
            {orderProgress.map((status, index) => (
              <span
                key={status}
                className={index <= statusIndex ? `is-complete status-${status}` : ''}
              />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            Estado atual: {statusIndex >= 0 ? orderProgressLabels[statusIndex] : item.status.name}
          </p>
          <div className="client-order-progress-labels">
            {orderProgressLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
