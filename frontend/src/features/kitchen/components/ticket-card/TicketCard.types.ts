import type { KitchenPatchableStatus } from '../../types/kitchen.types';
import type { KitchenInteractionMode } from '../../types/interactionMode.types';
import type { TicketFragment } from '../../utils/getTicketColumn';

export type TicketUrgency = 'normal' | 'warning' | 'danger';

export type TicketCardProps = {
  fragment: TicketFragment;
  onAdvanceStatus: (orderItemId: number, nextStatus: KitchenPatchableStatus) => void;
  urgency: TicketUrgency;
  elapsedMinutes: number;
  interactionMode: KitchenInteractionMode;
};
