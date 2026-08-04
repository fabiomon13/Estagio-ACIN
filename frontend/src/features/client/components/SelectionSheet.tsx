import { useEffect, useRef, useState } from 'react';

import { formatPrice } from '../clientConfig';
import type { MenuItem } from '../services/menuApi';

export type SelectionSheetProps = {
  items: MenuItem[];
  cart: Record<number, number>;
  buffetItemIds: Set<number>;
  isSubmitting: boolean;
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
  isSubmitting,
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
          const canDrag = !target?.closest('.client-selection-items');
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
          <h2 id="selection-title">Your selection</h2>
          <p>Current round</p>
        </header>

        <div className="client-selection-items">
          {items.map((item) => {
            const quantity = cart[item.id] ?? 0;
            return (
              <article key={item.id} className="client-selection-item">
                <div className="client-selection-thumbnail" aria-hidden={!item.photo_url}>
                  {item.photo_url ? <img src={item.photo_url} alt="" /> : '🍽️'}
                </div>
                <strong>{item.name}</strong>
                <div className="client-selection-quantity">
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove one unit of ${item.name}`}
                  >
                    −
                  </button>
                  <output aria-label={`${quantity} units`}>{quantity}</output>
                  <button
                    type="button"
                    className="is-add"
                    onClick={() => onAdd(item.id)}
                    aria-label={`Add one more unit of ${item.name}`}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="client-selection-delete"
                  onClick={() => onDelete(item.id)}
                  aria-label={`Remove ${item.name} from selection`}
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
        <button
          type="button"
          className="client-selection-submit"
          disabled={isSubmitting || items.length === 0}
          onClick={onSubmit}
        >
          {isSubmitting ? 'Sending…' : 'Send round'}
        </button>
      </section>
    </div>
  );
}
