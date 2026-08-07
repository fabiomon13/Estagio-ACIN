// frontend/src/features/client/menu/ProductDetailsModal.tsx

import { useEffect, useRef, useState } from 'react';

import CloseIcon from '../../../../components/icons/CloseIcon';
import {
  getCategoryConfig,
  getTagConfig,
  MAX_ITEM_QUANTITY,
  MAX_NOTES_LENGTH,
} from '../../clientConfig';
import type { MenuItem } from '../../services/menuApi';
import { MenuItemImage } from '../shared/MenuItemImage';

type ProductDetailsModalProps = {
  item: MenuItem;
  matchingAllergenTagIds: ReadonlySet<number>;
  showActions: boolean;
  onClose: () => void;
  onAdd: (quantity: number, notes: string) => void;
};

export function ProductDetailsModal({
  item,
  matchingAllergenTagIds,
  showActions,
  onClose,
  onAdd,
}: ProductDetailsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const category = getCategoryConfig(item.category.alias, item.category.name);

  const matchingAllergens = item.tags.filter((tag) => matchingAllergenTagIds.has(tag.id));

  const hasAllergyWarning = matchingAllergens.length > 0;

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;

      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [onClose]);

  function addToOrder(): void {
    onAdd(quantity, notes.trim());
    onClose();
  }

  return (
    <div
      className="client-product-details-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="client-product-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`product-details-title-${item.alias}`}
        aria-describedby={`product-details-description-${item.alias}`}
      >
        <div className="client-product-details-image">
          <MenuItemImage
            src={item.photo_url}
            alt=""
            fallback={<div aria-hidden="true">{category.emoji}</div>}
          />

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fechar detalhes do artigo"
            onClick={onClose}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="client-product-details-content">
          <h2 id={`product-details-title-${item.alias}`}>{item.name}</h2>

          <p id={`product-details-description-${item.alias}`}>
            {item.description ?? 'Descrição indisponível'}
          </p>

          {hasAllergyWarning && (
            <div className="client-product-allergy-warning" role="alert">
              <strong>Aviso de alergia</strong>
              <span>
                Contém:{' '}
                {matchingAllergens.map((tag) => tag.name.replace(/^Alergénio:\s*/i, '')).join(', ')}
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

          {showActions && (
            <>
              <label className="client-product-details-notes">
                <span>Notas especiais</span>
                <textarea
                  value={notes}
                  maxLength={MAX_NOTES_LENGTH}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>

              <div className="client-product-details-actions">
                <div className="client-product-details-quantity">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    aria-label="Diminuir quantidade"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  >
                    −
                  </button>

                  <output aria-label={`${quantity} unidades`}>{quantity}</output>

                  <button
                    type="button"
                    disabled={quantity >= MAX_ITEM_QUANTITY}
                    aria-label="Aumentar quantidade"
                    onClick={() =>
                      setQuantity((current) => Math.min(MAX_ITEM_QUANTITY, current + 1))
                    }
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className={hasAllergyWarning ? 'is-allergy-warning' : 'is-primary'}
                  onClick={addToOrder}
                >
                  {hasAllergyWarning ? 'Adicionar apesar do aviso' : 'Adicionar ao pedido'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
