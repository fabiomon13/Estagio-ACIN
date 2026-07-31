import TicketCard from '../ticket-card/TicketCard';
import { getElapsedMinutes, getTicketUrgency } from '../../utils/getTicketUrgency';
import type { KitchenColumnProps } from './KitchenColumn.types';

export default function KitchenColumn({ title, fragments, onAdvanceStatus }: KitchenColumnProps) {
  return (
    <div className="flex flex-1 min-w-0 flex-col gap-4">
      <h2 className="text-content-subtle text-sm font-semibold uppercase">{title}</h2>

      {fragments.map((fragment) => {
        const elapsedMinutes = getElapsedMinutes(fragment.created_at);

        return (
          <TicketCard
            key={fragment.order_id}
            fragment={fragment}
            elapsedMinutes={elapsedMinutes}
            urgency={getTicketUrgency(elapsedMinutes)}
            onAdvanceStatus={onAdvanceStatus}
          />
        );
      })}
    </div>
  );
}
