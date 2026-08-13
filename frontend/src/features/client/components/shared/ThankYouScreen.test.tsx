import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThankYouScreen } from './ThankYouScreen';

describe('ThankYouScreen', () => {
  it('confirma o pagamento e agradece ao cliente', () => {
    render(<ThankYouScreen tableNumber={3} onStartOver={() => {}} />);

    expect(screen.getByText('Pagamento concluído')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Obrigado pela visita!' })).toBeTruthy();
    expect(screen.getByText(/mesa 3/)).toBeTruthy();
  });

  describe('auto return', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('frees the table on its own after a few seconds, with no click needed', () => {
      const onStartOver = vi.fn();
      render(<ThankYouScreen tableNumber={3} onStartOver={onStartOver} />);

      expect(onStartOver).not.toHaveBeenCalled();
      vi.advanceTimersByTime(8_000);

      expect(onStartOver).toHaveBeenCalledTimes(1);
    });

    it('does not fire the auto-return after the screen has already been left', () => {
      const onStartOver = vi.fn();
      const { unmount } = render(<ThankYouScreen tableNumber={3} onStartOver={onStartOver} />);

      unmount();
      vi.advanceTimersByTime(8_000);

      expect(onStartOver).not.toHaveBeenCalled();
    });
  });
});
