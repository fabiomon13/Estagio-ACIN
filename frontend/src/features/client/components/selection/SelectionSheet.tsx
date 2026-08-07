import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';

import { formatPrice } from '../../clientConfig';
import type { MenuItem } from '../../services/menuApi';
import { SelectionItem } from './SelectionItem';

const CLOSE_DRAG_THRESHOLD = 100;

const FOCUSABLE_SELECTOR = [
  'button:not(:disabled)',
  '[href]',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export type SelectionSheetProps = {
  items: readonly MenuItem[];
  cart: Readonly<Record<number, number>>;
  buffetItemIds: ReadonlySet<number>;
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
  const sheetRef = useRef<HTMLElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const submittingRef = useRef(isSubmitting);

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    submittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    sheetRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submittingRef.current) {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !sheetRef.current) {
        return;
      }

      const focusableElements = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        sheetRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
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

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (buffetItemIds.has(item.id)) {
          return sum;
        }

        const quantity = cart[item.id] ?? 0;
        const unitPrice = Number(item.base_price);

        return Number.isFinite(unitPrice) ? sum + unitPrice * quantity : sum;
      }, 0),
    [buffetItemIds, cart, items],
  );

  function resetDrag(): void {
    touchStartYRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>): void {
    const target = event.target instanceof Element ? event.target : null;

    const canDrag = !target?.closest(
      ['button', 'a', 'input', 'select', 'textarea', '.client-selection-items'].join(', '),
    );

    touchStartYRef.current = canDrag ? (event.touches[0]?.clientY ?? null) : null;

    setIsDragging(canDrag);
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>): void {
    const startY = touchStartYRef.current;
    const currentY = event.touches[0]?.clientY;

    if (startY === null || currentY === undefined) {
      return;
    }

    event.preventDefault();
    setDragOffset(Math.max(0, currentY - startY));
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>): void {
    const startY = touchStartYRef.current;
    const endY = event.changedTouches[0]?.clientY;

    touchStartYRef.current = null;
    setIsDragging(false);

    const shouldClose =
      !isSubmitting &&
      !isClosing &&
      startY !== null &&
      endY !== undefined &&
      endY - startY > CLOSE_DRAG_THRESHOLD;

    if (shouldClose) {
      onClose();
      return;
    }

    setDragOffset(0);
  }

  return (
    <div
      className={['client-selection-backdrop', isClosing ? 'is-closing' : '']
        .filter(Boolean)
        .join(' ')}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting && !isClosing) {
          onClose();
        }
      }}
    >
      <section
        ref={sheetRef}
        tabIndex={-1}
        className={['client-selection-sheet', isClosing ? 'is-closing' : '']
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="selection-title"
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetDrag}
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

            return (
              <SelectionItem
                key={item.id}
                item={item}
                quantity={quantity}
                hasAllergyWarning={hasAllergyWarning}
                onAdd={() => onAdd(item.id)}
                onRemove={() => onRemove(item.id)}
                onDelete={() => onDelete(item.id)}
              />
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
