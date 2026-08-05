import type { KitchenPatchableStatus } from '../../types/kitchen.types';
import type { TicketFragment } from '../../utils/getTicketColumn';

export type KitchenColumnProps = {
  title: string;
  fragments: TicketFragment[];
  onAdvanceStatus: (orderItemId: number, nextStatus: KitchenPatchableStatus) => void;
};
