import type { KitchenPatchableStatus } from '../../types/kitchen.types';
import type { KitchenInteractionMode } from '../../types/interactionMode.types';
import type { DropColumn } from '../../hooks/useKitchenDragAndDrop';
import type { TicketFragment } from '../../utils/getTicketColumn';

export type KitchenColumnProps = {
  title: string;
  column: DropColumn;
  fragments: TicketFragment[];
  interactionMode: KitchenInteractionMode;
  onAdvanceStatus: (orderItemId: number, nextStatus: KitchenPatchableStatus) => void;
};
