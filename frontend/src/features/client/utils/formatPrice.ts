// frontend/src/features/client/utils/formatPrice.ts

import { logger } from '../../../utils/logger';

const priceFormatter = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
});

// Formats a price value (string or number) into a localized currency string.
export function formatPrice(value: string | number): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    logger.warn('Preço inválido recebido.', { value });

    return '—';
  }

  return priceFormatter.format(numericValue);
}
