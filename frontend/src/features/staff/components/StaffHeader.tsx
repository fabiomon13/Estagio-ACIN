import Button from '../../../components/ui/button/Button';

type StaffHeaderProps = {
  staffName?: string;
  onLogout: () => void;
};

export function StaffHeader({ staffName, onLogout }: StaffHeaderProps) {
  return (
    <header className="mb-5 flex items-center justify-between">
      <h1 className="text-3xl font-bold text-primary">Scan&Serve</h1>

      <div className="flex items-center gap-3">
        <span className="text-content-muted">{staffName}</span>

        <Button variant="outline" onClick={onLogout}>
          Sair
        </Button>
      </div>
    </header>
  );
}
