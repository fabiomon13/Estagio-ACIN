// frontend/src/features/client/menu/ProductCard.tsx

import { useCallback, useMemo, useState } from 'react';

import PlusIcon from '../../../../components/icons/PlusIcon';
import { formatPrice, getCategoryConfig, getTagConfig } from '../../clientConfig';
import type { MenuItem } from '../../services/menuApi';
import { MenuItemImage } from '../shared/MenuItemImage';
import { ProductDetailsModal } from './ProductDetailsModal';

type ProductCardProps = {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onAddDetails?: (quantity: number, notes: string) => void;
  onRemove: () => void;
  showActions?: boolean;
  priceMode?: 'unit' | 'included';
  selectedAllergenTagIds?: ReadonlySet<number>;
};

export function ProductCard({
  item,
  quantity,
  onAdd,
  onAddDetails,
  onRemove,
  showActions = true,
  priceMode = 'unit',
  selectedAllergenTagIds = new Set(),
}: ProductCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const category = getCategoryConfig(item.category.alias, item.category.name);

  const matchingAllergenTagIds = useMemo(
    () =>
      new Set(item.tags.filter((tag) => selectedAllergenTagIds.has(tag.id)).map((tag) => tag.id)),
    [item.tags, selectedAllergenTagIds],
  );

  const hasAllergyWarning = matchingAllergenTagIds.size > 0;

  const openDetails = useCallback(() => {
    setIsDetailsOpen(true);
  }, []);

  const closeDetails = useCallback(() => {
    setIsDetailsOpen(false);
  }, []);

  function addDetailsToOrder(detailQuantity: number, notes: string): void {
    if (onAddDetails) {
      onAddDetails(detailQuantity, notes);
      return;
    }

    for (let index = 0; index < detailQuantity; index += 1) {
      onAdd();
    }
  }

  return (
    <>
      <article className="client-product-card overflow-hidden rounded-2xl border border-border bg-surface shadow-lg shadow-black/20">
        <button
          type="button"
          className="client-product-visual relative h-32 overflow-hidden bg-gradient-to-br from-surface-elevated via-primary-soft to-surface-raised"
          aria-label={`Ver detalhes de ${item.name}`}
          onClick={openDetails}
        >
          <MenuItemImage
            src={item.photo_url}
            className="client-product-image size-full object-cover"
            loading="eager"
            fallback={
              <div
                className="client-product-placeholder grid size-full place-items-center text-5xl"
                aria-hidden="true"
              >
                {category.emoji}
              </div>
            }
          />

          <span className="client-product-price absolute bottom-2 right-2 rounded-full bg-black/85 px-2 py-1 text-xs font-bold text-white">
            {priceMode === 'included' ? 'Incluído' : formatPrice(item.base_price)}
          </span>
        </button>

        <div
          className={['client-product-content flex flex-col p-3', showActions ? '' : 'is-read-only']
            .filter(Boolean)
            .join(' ')}
        >
          <button
            type="button"
            className="client-product-summary-button"
            aria-label={`Ver detalhes de ${item.name}`}
            onClick={openDetails}
          >
            <h3 className="font-display text-base font-bold leading-tight">{item.name}</h3>

            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-content-muted">
              {item.description ?? 'Descrição indisponível'}
            </p>
          </button>

          <div className="mb-3 mt-2 flex min-h-5 flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => {
              const configuration = getTagConfig(tag.alias, tag.name);

              return (
                <span
                  key={tag.alias}
                  title={tag.name}
                  className={`client-product-tag is-${configuration.type}`}
                >
                  {configuration.label}
                </span>
              );
            })}

            {item.tags.length > 2 && (
              <span
                className="client-product-tag"
                aria-label={`Mais ${item.tags.length - 2} etiquetas`}
              >
                +{item.tags.length - 2}
              </span>
            )}
          </div>

          {showActions &&
            (quantity > 0 ? (
              <div className="client-quantity-control mt-auto flex items-center justify-between">
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-xl bg-surface-raised text-lg font-bold text-white transition active:opacity-75"
                  aria-label={`Remover uma unidade de ${item.name}`}
                  onClick={onRemove}
                >
                  −
                </button>

                <output className="text-base font-bold" aria-label={`${quantity} unidades`}>
                  {quantity}
                </output>

                <button
                  type="button"
                  className={[
                    'grid size-10 place-items-center rounded-xl text-lg font-bold transition',
                    hasAllergyWarning
                      ? 'bg-amber-400 text-black active:bg-amber-500'
                      : 'bg-primary text-white active:bg-primary-active',
                  ].join(' ')}
                  aria-label={
                    hasAllergyWarning
                      ? `Adicionar mais uma unidade de ${item.name}; aviso de alergia`
                      : `Adicionar mais uma unidade de ${item.name}`
                  }
                  onClick={onAdd}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={[
                  'client-add-button mt-auto flex w-full items-center justify-center rounded-xl px-2 py-2.5 text-sm font-bold transition',
                  hasAllergyWarning
                    ? 'bg-amber-400 text-black active:bg-amber-500'
                    : 'bg-primary text-white active:bg-primary-active',
                ].join(' ')}
                aria-label={
                  hasAllergyWarning
                    ? `Verificar aviso de alergia de ${item.name}`
                    : `Adicionar ${item.name}`
                }
                onClick={openDetails}
              >
                {hasAllergyWarning ? (
                  <span className="flex max-w-full items-center justify-center gap-1.5 text-[13px] tracking-tight">
                    <span className="shrink-0 text-base leading-none" aria-hidden="true">
                      ⚠
                    </span>
                    <span>Ver alergénios</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <PlusIcon size={17} />
                    <span>Adicionar</span>
                  </span>
                )}
              </button>
            ))}
        </div>
      </article>

      {isDetailsOpen && (
        <ProductDetailsModal
          item={item}
          matchingAllergenTagIds={matchingAllergenTagIds}
          showActions={showActions}
          onClose={closeDetails}
          onAdd={addDetailsToOrder}
        />
      )}
    </>
  );
}
