import LogoIcon from '../../../../components/icons/Logo';

type ThankYouScreenProps = {
  tableNumber?: number;
};

export function ThankYouScreen({ tableNumber }: ThankYouScreenProps) {
  return (
    <main className="client-thank-you-screen">
      <div className="client-thank-you-content">
        <LogoIcon className="client-thank-you-logo" />

        <div className="client-thank-you-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <p className="client-thank-you-eyebrow">Pagamento concluído</p>
          <h1>Obrigado pela visita!</h1>
          <p>
            Esperamos que tenha gostado da experiência
            {tableNumber === undefined ? '.' : ` na mesa ${tableNumber}.`}
          </p>
        </div>

        <p className="client-thank-you-farewell">Até breve.</p>
      </div>
    </main>
  );
}
