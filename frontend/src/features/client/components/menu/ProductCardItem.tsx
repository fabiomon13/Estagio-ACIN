import { memo, useCallback } from 'react';

import type { MenuItem } from '../../services/menuApi';
import { ProductCard } from './ProductCard';

type ProductCardItemProps = {
  item: MenuItem;
  quantity: number;
  selectedAllergenTagIds: ReadonlySet<number>;
  showActions?: boolean;
  priceMode?: 'unit' | 'included';
  onAddItem: (itemId: number) => void;
  onAddItemDetails?: (itemId: number, quantity: number, notes: string) => void;
  onRemoveItem: (itemId: number) => void;
};

export const ProductCardItem = memo(function ProductCardItem({
  item,
  quantity,
  selectedAllergenTagIds,
  showActions,
  priceMode,
  onAddItem,
  onAddItemDetails,
  onRemoveItem,
}: ProductCardItemProps) {
  const add = useCallback(() => onAddItem(item.id), [item.id, onAddItem]);
  const addDetails = useCallback(
    (detailQuantity: number, notes: string) => onAddItemDetails?.(item.id, detailQuantity, notes),
    [item.id, onAddItemDetails],
  );
  const remove = useCallback(() => onRemoveItem(item.id), [item.id, onRemoveItem]);

  return (
    <ProductCard
      item={item}
      quantity={quantity}
      selectedAllergenTagIds={selectedAllergenTagIds}
      showActions={showActions}
      priceMode={priceMode}
      onAdd={add}
      onAddDetails={addDetails}
      onRemove={remove}
    />
  );
});
