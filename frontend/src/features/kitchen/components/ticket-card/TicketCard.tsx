import type { ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Badge from '../../../../components/ui/badge/Badge';
import Button from '../../../../components/ui/button/Button';
import { CheckIcon, PlayIcon, WarningFilledIcon } from '../../../../components/icons';
import { getStationColor } from '../../../../utils/getStationColor';
import type { KitchenItemStatus, KitchenPatchableStatus } from '../../types/kitchen.types';
import type { KitchenDragPayload } from '../../hooks/useKitchenDragAndDrop';
import type { TicketCardProps } from './TicketCard.types';
import { ticketCardStyles as styles } from './TicketCard.styles';

// Kitchen only ever drives these two transitions.
const NEXT_STATUS: Partial<Record<KitchenItemStatus, KitchenPatchableStatus>> = {
  Pending: 'Preparing',
  Preparing: 'Ready',
};

const NEXT_LABEL: Partial<Record<KitchenItemStatus, string>> = {
  Pending: 'Preparar',
  Preparing: 'Pronto',
};

const NEXT_ICON: Partial<Record<KitchenItemStatus, ReactNode>> = {
  Pending: <PlayIcon size={16} />,
  Preparing: <CheckIcon size={16} />,
};

function FragmentDragHandle({
  fragmentKey,
  payload,
  children,
}: {
  fragmentKey: string;
  payload: KitchenDragPayload;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: fragmentKey,
    data: payload,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

export default function TicketCard({
  onAdvanceStatus,
  elapsedMinutes,
  fragment,
  urgency,
  interactionMode,
}: TicketCardProps) {
  const hasAllergyMatch = fragment.items.some((item) => item.matched_allergens.length > 0);
  const fragmentStatus = fragment.items[0]?.status;
  const isDragMode = interactionMode === 'drag';

  const header = (
    <header className="flex items-center justify-between">
      <p className="text-sm text-content-subtle">
        {`T${fragment.table_number} · Ronda #${fragment.round_number} · C${fragment.guest_number}`}
      </p>

      <Badge
        variant={urgency === 'normal' ? 'success' : urgency === 'warning' ? 'warning' : 'danger'}
      >
        {`${elapsedMinutes} min`}
      </Badge>
    </header>
  );

  return (
    <div className={`${styles.card} ${styles.border[urgency]}`}>
      {isDragMode && fragmentStatus ? (
        <FragmentDragHandle
          fragmentKey={`fragment-${fragment.order_id}-${fragmentStatus}`}
          payload={{
            type: 'fragment',
            orderItemIds: fragment.items.map((item) => item.order_item_id),
            status: fragmentStatus,
          }}
        >
          {header}
        </FragmentDragHandle>
      ) : (
        header
      )}

      <div className="my-3 h-px w-full rounded-full bg-border" />

      {hasAllergyMatch && (
        <div className={styles.allergenBanner}>
          <WarningFilledIcon size={14} />
          <span>Alergia neste pedido — confirmar antes de servir</span>
        </div>
      )}

      <section className="flex flex-col gap-4">
        {fragment.items.map((item) => {
          const nextStatus = NEXT_STATUS[item.status];

          const itemRow = (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className={`${styles.stationDot} ${getStationColor(item.station)}`} />

                <div className="min-w-0">
                  <p className={styles.itemName}>{`${item.quantity}x ${item.menu_item_name}`}</p>

                  {item.notes && <p className="text-xs italic text-content-subtle">{item.notes}</p>}

                  {item.matched_allergens.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.matched_allergens.map((tag) => (
                        <Badge key={tag} size="sm" variant="danger">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {!isDragMode && (
                <div className="shrink-0">
                  {nextStatus && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onAdvanceStatus(item.order_item_id, nextStatus)}
                    >
                      {NEXT_ICON[item.status]} {NEXT_LABEL[item.status]}
                    </Button>
                  )}

                  {item.status === 'Ready' && (
                    <span className={styles.statusDoneLabel}>
                      <CheckIcon size={14} /> Pronto
                    </span>
                  )}
                </div>
              )}
            </div>
          );

          return isDragMode ? (
            <FragmentDragHandle
              key={item.order_item_id}
              fragmentKey={`item-${item.order_item_id}`}
              payload={{ type: 'item', orderItemId: item.order_item_id, status: item.status }}
            >
              {itemRow}
            </FragmentDragHandle>
          ) : (
            <div key={item.order_item_id}>{itemRow}</div>
          );
        })}
      </section>
    </div>
  );
}
