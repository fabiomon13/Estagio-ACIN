// frontend/src/features/client/pages/ClientPage.test.tsx

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientPage } from './ClientPage';

// toast mock used to render the page without the application provider
const showToast = vi.fn();

vi.mock('../../../components/ui/toast/useToast', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/menuApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/menuApi')>();

  return {
    ...original,
    getTable: vi.fn(() => new Promise(() => undefined)),
  };
});

// render the client page inside its real router context
function renderPage(path: string, route = '/client/:tableCode') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={<ClientPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// describe the smoke-test suite for the main client page
describe('ClientPage', () => {
  // reset callbacks before every test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // test case to check the missing table-code state
  it('mostra uma mensagem quando falta o código da mesa', () => {
    renderPage('/', '/');

    expect(screen.getByText('Falta o código da mesa.')).toBeTruthy();
  });

  // test case to check the initial menu loading state
  it('mostra o estado de carregamento enquanto prepara o menu', () => {
    renderPage('/client/mesa-01');

    expect(screen.getByText(/A preparar o menu/i)).toBeTruthy();
  });
});
