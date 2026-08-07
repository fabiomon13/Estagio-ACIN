import { AvatarIcon } from '../../../components/icons';
import Button from '../../../components/ui/button/Button';

type StaffHeaderProps = {
  staffName?: string;
  photoUrl?: string | null;
  onOpenProfile: () => void;
  onLogout: () => void;
};

export function StaffHeader({ staffName, photoUrl, onOpenProfile, onLogout }: StaffHeaderProps) {
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

        <Button variant="outline" onClick={onLogout}>
          Sair
        </Button>
      </div>
    </header>
  );
}
