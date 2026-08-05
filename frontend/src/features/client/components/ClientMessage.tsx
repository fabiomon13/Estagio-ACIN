import LogoIcon from '../../../components/icons/Logo';

type ClientMessageProps = {
  message: string;
  isError?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function ClientMessage({
  message,
  isError = false,
  actionLabel,
  onAction,
}: ClientMessageProps) {
  return (
    <main className="client-message-screen">
      <div className="client-message-content">
        <LogoIcon className="client-message-logo" />
        <p
          className={`client-message-text ${isError ? 'is-error' : ''}`}
          role={isError ? 'alert' : 'status'}
          aria-live={isError ? 'assertive' : 'polite'}
        >
          {message}
        </p>
        {actionLabel && onAction && (
          <button type="button" className="session-submit client-message-action" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </main>
  );
}
