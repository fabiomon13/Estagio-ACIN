import { AvatarIcon } from '../../../components/icons';
import Button from '../../../components/ui/button/Button';

type StaffHeaderProps = {
  staffName?: string;
  photoUrl?: string | null;
  onOpenProfile: () => void;
  onLogout: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
};

export function StaffHeader({
  staffName,
  photoUrl,
  onOpenProfile,
  onLogout,
  notificationsEnabled,
  onToggleNotifications,
}: StaffHeaderProps) {
  return (
    <header className="mb-5 flex items-center justify-between">
      <h1 className="text-3xl font-bold text-primary">Scan&Serve</h1>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2 rounded-xl px-2 py-1 text-content-muted transition-colors hover:bg-surface-hover hover:text-content"
          aria-label="Abrir perfil"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`Fotografia de ${staffName ?? 'staff'}`}
              className="size-9 rounded-full object-cover ring-1 ring-border-strong"
            />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-surface-raised ring-1 ring-border-strong">
              <AvatarIcon size={22} className="text-content-muted" />
            </span>
          )}

          <span className="hidden text-sm sm:block">{staffName}</span>
        </button>

        <Button
          type="button"
          onClick={onToggleNotifications}
          aria-label={
            notificationsEnabled ? 'Desativar notificações sonoras' : 'Ativar notificações sonoras'
          }
          title={
            notificationsEnabled ? 'Desativar notificações sonoras' : 'Ativar notificações sonoras'
          }
          className={`grid size-10 place-items-center rounded-full border transition-colors ${
            notificationsEnabled
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-border bg-surface-raised text-content-muted'
          }`}
        >
          <span aria-hidden="true">{notificationsEnabled ? '🔔' : '🔕'}</span>
        </Button>

        <Button variant="outline" onClick={onLogout}>
          Sair
        </Button>
      </div>
    </header>
  );
}
