// frontend/src/features/client/services/clientRequest.test.ts

import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../services/api/client';
import { buildClientTablePath, createDeviceHeaders, isApiStatus } from './clientRequest';

// describe the test suite for the shared client request helpers
describe('clientRequest', () => {
  // test case to check if table codes are normalized and safely encoded
  it('normaliza e codifica o código da mesa', () => {
    expect(buildClientTablePath(' Mesa 1 ')).toBe('/client/tables/Mesa%201');
  });

  // test case to check if empty table codes and device tokens are rejected
  it('rejeita código e token vazios', () => {
    expect(() => buildClientTablePath(' ')).toThrow();
    expect(() => createDeviceHeaders(' ')).toThrow();
  });

  // test case to check if device and JSON headers are created correctly
  it('cria headers do dispositivo com JSON opcional', () => {
    expect(createDeviceHeaders(' token ', { includeJson: true })).toEqual({
      'X-Device-Token': 'token',
      'Content-Type': 'application/json',
    });
  });

  // test case to check if API errors are identified by status code
  it('identifica o estado de um ApiError', () => {
    expect(isApiStatus(new ApiError(404, 'Não encontrado'), 404)).toBe(true);
    expect(isApiStatus(new Error('x'), 404)).toBe(false);
  });
});
