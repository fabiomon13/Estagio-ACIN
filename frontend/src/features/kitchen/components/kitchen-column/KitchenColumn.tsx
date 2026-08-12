import { useDroppable } from '@dnd-kit/core';
import TicketCard from '../ticket-card/TicketCard';
import { getElapsedMinutes, getTicketUrgency } from '../../utils/getTicketUrgency';
import type { KitchenColumnProps } from './KitchenColumn.types';

export default function KitchenColumn({
  title,
  column,
  fragments,
  interactionMode,
  onAdvanceStatus,
}: KitchenColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column, disabled: interactionMode !== 'drag' });

  return (
    <div
      ref={interactionMode === 'drag' ? setNodeRef : undefined}
      className={`flex flex-1 min-w-0 flex-col gap-4 rounded-2xl transition-colors min-h-screen ${
        interactionMode === 'drag' && isOver ? 'bg-surface' : ''
      }`}
    >
      <h2 className="text-content-subtle text-sm font-semibold uppercase">{title}</h2>

      {fragments.map((fragment) => {
        const elapsedMinutes = getElapsedMinutes(fragment.created_at);

        return (
          <TicketCard
            key={fragment.order_id}
            fragment={fragment}
            elapsedMinutes={elapsedMinutes}
            urgency={getTicketUrgency(elapsedMinutes)}
            interactionMode={interactionMode}
            onAdvanceStatus={onAdvanceStatus}
          />
        );
      })}
    </div>
  );
}
