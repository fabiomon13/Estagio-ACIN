import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThankYouScreen } from './ThankYouScreen';

describe('ThankYouScreen', () => {
  it('confirma o pagamento e agradece ao cliente', () => {
    render(<ThankYouScreen tableNumber={3} />);

    expect(screen.getByText('Pagamento concluído')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Obrigado pela visita!' })).toBeTruthy();
    expect(screen.getByText(/mesa 3/)).toBeTruthy();
  });
});
