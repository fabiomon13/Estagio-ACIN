// frontend/src/features/client/utils/formatPrice.test.ts

import { describe, expect, it } from 'vitest';

import { formatPrice } from './formatPrice';

// describe the test suite for localized menu prices
describe('formatPrice', () => {
  // test case to check numeric euro formatting
  it('formata números em euros', () => {
    expect(formatPrice(12.5)).toMatch(/12,50\s*€/);
  });

  // test case to check numeric values received as strings
  it('aceita valores numéricos recebidos como texto', () => {
    expect(formatPrice('7.25')).toMatch(/7,25\s*€/);
  });

  // test case to check the fallback for invalid prices
  it('devolve um travessão para valores inválidos', () => {
    expect(formatPrice('inválido')).toBe('—');
  });
});
