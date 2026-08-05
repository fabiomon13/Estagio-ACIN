import { useCallback, useMemo, useState } from 'react';

export function useClientCart() {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  const addToCart = useCallback((itemId: number) => {
    setCart((current) => ({ ...current, [itemId]: (current[itemId] ?? 0) + 1 }));
  }, []);

  const addQuantity = useCallback((itemId: number, quantity: number) => {
    setCart((current) => ({ ...current, [itemId]: (current[itemId] ?? 0) + quantity }));
  }, []);

  const setItemNotes = useCallback((itemId: number, value: string) => {
    setNotes((current) => {
      const next = { ...current };
      const normalizedValue = value.trim();
      if (normalizedValue) next[itemId] = normalizedValue;
      else delete next[itemId];
      return next;
    });
  }, []);

  const removeFromCart = useCallback((itemId: number) => {
    setCart((current) => {
      const nextQuantity = (current[itemId] ?? 0) - 1;
      if (nextQuantity <= 0) {
        const nextCart = { ...current };
        delete nextCart[itemId];
        setNotes((currentNotes) => {
          const nextNotes = { ...currentNotes };
          delete nextNotes[itemId];
          return nextNotes;
        });
        return nextCart;
      }
      return { ...current, [itemId]: nextQuantity };
    });
  }, []);

  const removeCartItem = useCallback((itemId: number) => {
    setCart((current) => {
      const nextCart = { ...current };
      delete nextCart[itemId];
      return nextCart;
    });
    setNotes((current) => {
      const nextNotes = { ...current };
      delete nextNotes[itemId];
      return nextNotes;
    });
  }, []);

  const removeItems = useCallback((itemIds: ReadonlySet<number>) => {
    setCart((current) => {
      const entries = Object.entries(current).filter(([itemId]) => !itemIds.has(Number(itemId)));
      return Object.fromEntries(entries) as Record<number, number>;
    });
    setNotes((current) => {
      const entries = Object.entries(current).filter(([itemId]) => !itemIds.has(Number(itemId)));
      return Object.fromEntries(entries) as Record<number, string>;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({});
    setNotes({});
  }, []);
  const cartCount = useMemo(
    () => Object.values(cart).reduce((total, quantity) => total + quantity, 0),
    [cart],
  );

  return {
    cart,
    notes,
    cartCount,
    addToCart,
    addQuantity,
    setItemNotes,
    removeFromCart,
    removeCartItem,
    removeItems,
    clearCart,
  };
}
