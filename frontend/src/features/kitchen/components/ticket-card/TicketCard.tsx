import { useState } from 'react';
import type { ReactNode } from 'react';
import Badge from '../../../../components/ui/badge/Badge';
import Button from '../../../../components/ui/button/Button';
import { CheckIcon, CloseIcon, PlayIcon, WarningFilledIcon } from '../../../../components/icons';
import { getStationColor } from '../../../../utils/getStationColor';
import type { KitchenItemStatus, KitchenPatchableStatus } from '../../types/kitchen.types';
import type { TicketCardProps } from './TicketCard.types';
import { ticketCardStyles as styles } from './TicketCard.styles';

// Statuses whose items are shown struck-through/muted
const TERMINAL_STATUSES: readonly KitchenItemStatus[] = ['Served', 'Cancelled', 'Returned'];

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

// A tag is treated as an allergen warning if it follows the naming
// convention already seeded in the backend (Alergénio: crustáceos)
function isAllergenTag(tag: string): boolean {
  return tag.startsWith('Alergénio');
}

export default function TicketCard({
  onAdvanceStatus,
  elapsedMinutes,
  ticket,
  urgency,
}: TicketCardProps) {
  // Hides cancelled items from this kitchen view only.
  // Their backend status remains unchanged, and served items cannot be dismissed.
  const [dismissedItemIds, setDismissedItemIds] = useState<Set<number>>(new Set());

  const visibleItems = ticket.items.filter((item) => !dismissedItemIds.has(item.order_item_id));
  const hasAllergen = ticket.items.some((item) => item.tags.some(isAllergenTag));

  const dismissItem = (orderItemId: number) => {
    setDismissedItemIds((prev) => new Set(prev).add(orderItemId));
  };

  return (
    <div className={`${styles.card} ${styles.border[urgency]}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{`T${ticket.table_number}`}</h1>
          <p className="text-content-subtle">{`Ronda #${ticket.round_number} · C${ticket.guest_number}`}</p>
        </div>

        <Badge
          variant={urgency === 'normal' ? 'success' : urgency === 'warning' ? 'warning' : 'danger'}
        >
          {`${elapsedMinutes} min`}
        </Badge>
      </header>

      <div className="my-3 h-px w-full rounded-full bg-border" />

      {hasAllergen && (
        <div className={styles.allergenBanner}>
          <WarningFilledIcon size={14} />
          <span>Alergénio nesta ronda — verificar cada prato</span>
        </div>
      )}

      <section className="flex flex-col gap-4">
        {visibleItems.map((item) => {
          const isTerminal = TERMINAL_STATUSES.includes(item.status);
          const nextStatus = NEXT_STATUS[item.status];
          const allergenTags = item.tags.filter(isAllergenTag);
          const dietaryTags = item.tags.filter((tag) => !isAllergenTag(tag));

          return (
            <div key={item.order_item_id} className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className={`${styles.stationDot} ${getStationColor(item.station)}`} />

                <div className="min-w-0">
                  <p className={isTerminal ? styles.itemNameTerminal : styles.itemName}>
                    {`${item.quantity}x ${item.menu_item_name}`}
                  </p>

                  {item.status === 'Cancelled' && (
                    <p className="text-xs font-medium text-danger">Cancelado por cliente</p>
                  )}

                  {item.notes && <p className="text-xs italic text-content-subtle">{item.notes}</p>}

                  {(allergenTags.length > 0 || dietaryTags.length > 0) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {allergenTags.map((tag) => (
                        <Badge key={tag} size="sm" variant="danger">
                          {tag}
                        </Badge>
                      ))}
                      {dietaryTags.map((tag) => (
                        <Badge key={tag} size="sm" variant="info">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
                {item.status === 'Served' && (
                  <span className={styles.statusDoneLabel}>
                    <CheckIcon size={14} /> Entregue
                  </span>
                )}

                {item.status === 'Cancelled' && (
                  <div className="group relative flex">
                    <button
                      type="button"
                      onClick={() => dismissItem(item.order_item_id)}
                      aria-label={`Remover ${item.menu_item_name} da vista`}
                      className={styles.dismissButton}
                    >
                      <CloseIcon size={14} />
                    </button>
                    <span role="tooltip" className={styles.dismissTooltip}>
                      Remover da vista
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
