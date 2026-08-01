import type { ReactNode } from 'react';
import Badge from '../../../../components/ui/badge/Badge';
import Button from '../../../../components/ui/button/Button';
import { CheckIcon, PlayIcon, WarningFilledIcon } from '../../../../components/icons';
import { getStationColor } from '../../../../utils/getStationColor';
import type { KitchenItemStatus, KitchenPatchableStatus } from '../../types/kitchen.types';
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

// A tag is treated as an allergen warning if it follows the naming
// convention already seeded in the backend (Alergénio: crustáceos)
function isAllergenTag(tag: string): boolean {
  return tag.startsWith('Alergénio');
}

export default function TicketCard({
  onAdvanceStatus,
  elapsedMinutes,
  fragment,
  urgency,
}: TicketCardProps) {
  const hasAllergen = fragment.items.some((item) => item.tags.some(isAllergenTag));

  return (
    <div className={`${styles.card} ${styles.border[urgency]}`}>
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

      <div className="my-3 h-px w-full rounded-full bg-border" />

      {hasAllergen && (
        <div className={styles.allergenBanner}>
          <WarningFilledIcon size={14} />
          <span>Alergénio nestes pratos — verificar cada prato</span>
        </div>
      )}

      <section className="flex flex-col gap-4">
        {fragment.items.map((item) => {
          const nextStatus = NEXT_STATUS[item.status];
          const allergenTags = item.tags.filter(isAllergenTag);

          return (
            <div key={item.order_item_id} className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className={`${styles.stationDot} ${getStationColor(item.station)}`} />

                <div className="min-w-0">
                  <p className={styles.itemName}>{`${item.quantity}x ${item.menu_item_name}`}</p>

                  {item.notes && <p className="text-xs italic text-content-subtle">{item.notes}</p>}

                  {allergenTags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {allergenTags.map((tag) => (
                        <Badge key={tag} size="sm" variant="danger">
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
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
