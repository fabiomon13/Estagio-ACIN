import { useEffect, useRef, useState } from 'react';

import { formatPrice } from '../clientConfig';
import type { MenuItem } from '../services/menuApi';
import { getCategoryConfig } from '../clientConfig';
import { MenuItemImage } from './MenuItemImage';

export type SelectionSheetProps = {
  items: MenuItem[];
  cart: Record<number, number>;
  buffetItemIds: Set<number>;
  selectedAllergenTagIds: ReadonlySet<number>;
  isSubmitting: boolean;
  hasActiveOrder: boolean;
  isClosing?: boolean;
  onAdd: (itemId: number) => void;
  onRemove: (itemId: number) => void;
  onDelete: (itemId: number) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function SelectionSheet({
  items,
  cart,
  buffetItemIds,
  selectedAllergenTagIds,
  isSubmitting,
  hasActiveOrder,
  isClosing = false,
  onAdd,
  onRemove,
  onDelete,
  onClose,
  onSubmit,
}: SelectionSheetProps) {
  const sheetTouchStart = useRef<number | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const submittingRef = useRef(isSubmitting);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  useEffect(() => {
    submittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    sheetRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submittingRef.current) onClose();
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const total = items.reduce(
    (sum, item) =>
      sum + (buffetItemIds.has(item.id) ? 0 : Number(item.base_price) * (cart[item.id] ?? 0)),
    0,
  );

  return (
    <div
      className={`client-selection-backdrop ${isClosing ? 'is-closing' : ''}`}
      role="presentation"
      onClick={() => {
        if (!isSubmitting && !isClosing) onClose();
      }}
    >
      <section
        ref={sheetRef}
        tabIndex={-1}
        className={`client-selection-sheet ${isClosing ? 'is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="selection-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: sheetDragOffset > 0 ? `translateY(${sheetDragOffset}px)` : undefined,
          transition: isDraggingSheet ? 'none' : undefined,
        }}
        onTouchStart={(event) => {
          const target = event.target instanceof Element ? event.target : null;
          // Do not turn taps on controls into sheet-drag gestures. On touch
          // devices even a tiny movement would call preventDefault below and
          // cancel the button's click (notably the "Send round" action).
          const canDrag = !target?.closest(
            'button, a, input, select, textarea, .client-selection-items',
          );
          sheetTouchStart.current = canDrag ? event.touches[0].clientY : null;
          setIsDraggingSheet(canDrag);
        }}
        onTouchMove={(event) => {
          const startY = sheetTouchStart.current;
          if (startY === null) return;
          event.preventDefault();
          setSheetDragOffset(Math.max(0, event.touches[0].clientY - startY));
        }}
        onTouchEnd={(event) => {
          const startY = sheetTouchStart.current;
          sheetTouchStart.current = null;
          setIsDraggingSheet(false);
          if (
            !isSubmitting &&
            !isClosing &&
            startY !== null &&
            event.changedTouches[0].clientY - startY > 100
          ) {
            onClose();
          } else {
            setSheetDragOffset(0);
          }
        }}
      >
        <div className="client-selection-handle" aria-hidden="true" />
        <header className="client-selection-heading">
          <h2 id="selection-title">A sua seleção</h2>
          <p>Ronda atual</p>
        </header>

        <div className="client-selection-items">
          {items.map((item) => {
            const quantity = cart[item.id] ?? 0;
            const hasAllergyWarning = item.tags.some((tag) => selectedAllergenTagIds.has(tag.id));
            const category = getCategoryConfig(item.category.alias, item.category.name);
            return (
              <article key={item.alias} className="client-selection-item">
                <div className="client-selection-thumbnail" aria-hidden={!item.photo_url}>
                  <MenuItemImage src={item.photo_url} fallback={category.emoji} />
                </div>
                <strong>{item.name}</strong>
                <div className="client-selection-quantity">
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remover uma unidade de ${item.name}`}
                  >
                    −
                  </button>
                  <output aria-label={`${quantity} unidades`}>{quantity}</output>
                  <button
                    type="button"
                    className={`is-add ${hasAllergyWarning ? 'is-allergy-warning' : ''}`}
                    onClick={() => onAdd(item.id)}
                    aria-label={
                      hasAllergyWarning
                        ? `Adicionar mais uma unidade de ${item.name}; aviso de alergia`
                        : `Adicionar mais uma unidade de ${item.name}`
                    }
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="client-selection-delete"
                  onClick={() => onDelete(item.id)}
                  aria-label={`Remover ${item.name} da seleção`}
                >
                  ×
                </button>
              </article>
            );
          })}
        </div>

        <div className="client-selection-total">
          <span>Total</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        {hasActiveOrder && (
          <p className="client-selection-order-warning" role="status">
            Aguarde que o pedido atual seja servido antes de enviar outra ronda.
          </p>
        )}
        <button
          type="button"
          className="client-selection-submit"
          disabled={isSubmitting || hasActiveOrder || items.length === 0}
          onClick={onSubmit}
        >
          {isSubmitting ? 'A enviar…' : hasActiveOrder ? 'Pedido em curso' : 'Enviar ronda'}
        </button>
      </section>
    </div>
  );
}
