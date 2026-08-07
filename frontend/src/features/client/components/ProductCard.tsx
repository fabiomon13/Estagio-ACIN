import { useEffect, useRef, useState } from 'react';
import { toMediaUrl } from '../../../services/api/client';
import CloseIcon from '../../../components/icons/CloseIcon';
import PlusIcon from '../../../components/icons/PlusIcon';
import { formatPrice, getCategoryConfig, getTagConfig } from '../clientConfig';
import type { MenuItem } from '../services/menuApi';

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
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailNotes, setDetailNotes] = useState('');
  const detailCloseButtonRef = useRef<HTMLButtonElement>(null);
  const category = getCategoryConfig(item.category.alias, item.category.name);
  const matchingAllergens = item.tags.filter((tag) => selectedAllergenTagIds.has(tag.id));
  const hasAllergyWarning = matchingAllergens.length > 0;

  useEffect(() => {
    if (!isDetailsOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    detailCloseButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDetailsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDetailsOpen]);

  function openDetails() {
    setDetailQuantity(1);
    setDetailNotes('');
    setIsDetailsOpen(true);
  }

  function addDetailsToOrder() {
    if (onAddDetails) onAddDetails(detailQuantity, detailNotes);
    else {
      for (let index = 0; index < detailQuantity; index += 1) onAdd();
    }
    setIsDetailsOpen(false);
  }

  return (
    <article className="client-product-card overflow-hidden rounded-2xl border border-border bg-surface shadow-lg shadow-black/20">
      <button
        type="button"
        className="client-product-visual relative h-32 overflow-hidden bg-gradient-to-br from-surface-elevated via-primary-soft to-surface-raised"
        aria-label={`Ver detalhes de ${item.name}`}
        onClick={openDetails}
      >
        {item.photo_url ? (
          <img
            src={toMediaUrl(item.photo_url) ?? undefined}
            alt=""
            className="client-product-image size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="client-product-placeholder grid size-full place-items-center text-5xl"
            aria-hidden="true"
          >
            {category.emoji}
          </div>
        )}
        <span className="client-product-price absolute bottom-2 right-2 rounded-full bg-black/85 px-2 py-1 text-xs font-bold text-white">
          {priceMode === 'included' ? 'Incluído' : formatPrice(item.base_price)}
        </span>
      </button>

      <div
        className={`client-product-content flex flex-col p-3 ${showActions ? '' : 'is-read-only'}`}
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
            const tagConfiguration = getTagConfig(tag.alias, tag.name);

            return (
              <span
                key={tag.alias}
                title={tag.name}
                className={`client-product-tag is-${tagConfiguration.type}`}
              >
                {tagConfiguration.label}
              </span>
            );
          })}
          {item.tags.length > 2 && (
            <span className="client-product-tag" aria-label={`Mais ${item.tags.length - 2} tags`}>
              +{item.tags.length - 2}
            </span>
          )}
        </div>
        {showActions &&
          (quantity > 0 ? (
            <div className="client-quantity-control mt-auto flex items-center justify-between">
              <button
                type="button"
                onClick={onRemove}
                className="grid size-10 place-items-center rounded-xl bg-surface-raised text-lg font-bold text-white transition active:opacity-75"
                aria-label={`Remover uma unidade de ${item.name}`}
              >
                −
              </button>
              <output className="text-base font-bold" aria-label={`${quantity} unidades`}>
                {quantity}
              </output>
              <button
                type="button"
                onClick={onAdd}
                className={`grid size-10 place-items-center rounded-xl text-lg font-bold transition ${
                  hasAllergyWarning
                    ? 'bg-amber-400 text-black active:bg-amber-500'
                    : 'bg-primary text-white active:bg-primary-active'
                }`}
                aria-label={
                  hasAllergyWarning
                    ? `Adicionar mais uma unidade de ${item.name}; aviso de alergia`
                    : `Adicionar mais uma unidade de ${item.name}`
                }
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openDetails}
              aria-label={
                hasAllergyWarning
                  ? `Verificar aviso de alergia de ${item.name}`
                  : `Adicionar ${item.name}`
              }
              className={`client-add-button mt-auto flex w-full items-center justify-center rounded-xl px-2 py-2.5 text-sm font-bold transition ${
                hasAllergyWarning
                  ? 'bg-amber-400 text-black active:bg-amber-500'
                  : 'bg-primary text-white active:bg-primary-active'
              }`}
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

      {isDetailsOpen && (
        <div
          className="client-product-details-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsDetailsOpen(false);
          }}
        >
          <section
            className="client-product-details"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`product-details-title-${item.alias}`}
          >
            <div className="client-product-details-image">
              {item.photo_url ? (
                <img src={toMediaUrl(item.photo_url) ?? undefined} alt="" />
              ) : (
                <div aria-hidden="true">{category.emoji}</div>
              )}
              <button
                ref={detailCloseButtonRef}
                type="button"
                aria-label="Fechar detalhes do artigo"
                onClick={() => setIsDetailsOpen(false)}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="client-product-details-content">
              <h2 id={`product-details-title-${item.alias}`}>{item.name}</h2>
              <p>{item.description ?? 'Descrição indisponível'}</p>

              {hasAllergyWarning && (
                <div className="client-product-allergy-warning" role="alert">
                  <strong>Aviso de alergia</strong>
                  <span>
                    Contém:{' '}
                    {matchingAllergens
                      .map((tag) => tag.name.replace(/^Alergénio:\s*/i, ''))
                      .join(', ')}
                  </span>
                </div>
              )}

              {item.tags.length > 0 && (
                <div className="client-product-details-tags">
                  {item.tags.map((tag) => {
                    const configuration = getTagConfig(tag.alias, tag.name);
                    return (
                      <span key={tag.alias} className={`is-${configuration.type}`}>
                        {configuration.label}
                      </span>
                    );
                  })}
                </div>
              )}

              <label className="client-product-details-notes">
                <span>Notas especiais</span>
                <textarea
                  value={detailNotes}
                  maxLength={300}
                  onChange={(event) => setDetailNotes(event.target.value)}
                />
              </label>

              <div className="client-product-details-actions">
                <div className="client-product-details-quantity">
                  <button
                    type="button"
                    disabled={detailQuantity <= 1}
                    aria-label="Diminuir quantidade"
                    onClick={() => setDetailQuantity((current) => Math.max(1, current - 1))}
                  >
                    −
                  </button>
                  <output aria-label={`${detailQuantity} unidades`}>{detailQuantity}</output>
                  <button
                    type="button"
                    aria-label="Aumentar quantidade"
                    onClick={() => setDetailQuantity((current) => current + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className={hasAllergyWarning ? 'is-allergy-warning' : 'is-primary'}
                  onClick={addDetailsToOrder}
                >
                  {hasAllergyWarning ? 'Adicionar apesar do aviso' : 'Adicionar ao pedido'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}
