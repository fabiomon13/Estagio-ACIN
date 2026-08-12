import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChevronIcon from '../../../components/icons/ChevronIcon';
import { AvatarIcon, CloseIcon } from '../../../components/icons';
import Badge from '../../../components/ui/badge/Badge';
import Button from '../../../components/ui/button/Button';
import ConfirmDialog from '../../../components/ui/confirm-dialog/ConfirmDialog';
import { useToast } from '../../../components/ui/toast/useToast';
import { ROLE_HOME_ROUTE, useAuth } from '../hooks/AuthContext';

type StaffProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  chef: 'Cozinheiro',
  admin: 'Administrador',
  waiter: 'Garçom',
};

// Admin-only shortcuts to the other role areas -- filtered down to whichever
// ones aren't the page the modal was opened from.
const AREA_SHORTCUTS = [
  { path: ROLE_HOME_ROUTE.waiter, label: 'Ir para Staff' },
  { path: ROLE_HOME_ROUTE.chef, label: 'Ir para Cozinha' },
  { path: ROLE_HOME_ROUTE.admin, label: 'Ir para Admin' },
];

export function StaffProfileModal({ isOpen, onClose }: StaffProfileModalProps) {
  const { staff, logout, updateShiftStatus } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isTogglingShift, setIsTogglingShift] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Mount the panel the instant it opens, and start its exit transition the
  // instant it closes. Adjusted during render (not an effect) so each takes
  // effect on this same render pass instead of the next one.
  if (isOpen && !shouldRender) {
    setShouldRender(true);
  }
  if (!isOpen && isVisible) {
    setIsVisible(false);
  }

  // The panel must stay mounted for the closing animation to play.
  useEffect(() => {
    if (isOpen || !shouldRender) return;

    const removalTimer = window.setTimeout(() => setShouldRender(false), 300);
    return () => window.clearTimeout(removalTimer);
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!shouldRender || !isOpen) return;
    let didTrigger = false;
    const trigger = () => {
      if (didTrigger) return;
      didTrigger = true;
      setIsVisible(true);
    };
    const outerFrame = requestAnimationFrame(() => {
      requestAnimationFrame(trigger);
    });
    const fallbackTimer = window.setTimeout(trigger, 50);
    return () => {
      cancelAnimationFrame(outerFrame);
      window.clearTimeout(fallbackTimer);
    };
  }, [shouldRender, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (showLogoutConfirm) return;
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose, showLogoutConfirm]);

  if (!shouldRender || !staff) return null;

  async function handleToggleShift() {
    if (!staff) return;
    setIsTogglingShift(true);
    try {
      await updateShiftStatus(!staff.is_active);
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível alterar turno' });
    } finally {
      setIsTogglingShift(false);
    }
  }

  async function handleConfirmLogout() {
    setShowLogoutConfirm(false);
    try {
      await logout();
      onClose();
      navigate('/login');
    } catch {
      showToast({ variant: 'danger', title: 'Não foi possível terminar sessão' });
    }
  }

  const roleLabel = ROLE_LABELS[staff.role] ?? staff.role;
  const areaShortcuts =
    staff.role === 'admin'
      ? AREA_SHORTCUTS.filter((shortcut) => !location.pathname.startsWith(shortcut.path))
      : [];

  function handleNavigateToArea(path: string) {
    onClose();
    navigate(path);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ease-in-out ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-profile-title"
          className={`relative flex h-full w-full max-w-sm flex-col justify-between overflow-y-auto rounded-l-4xl bg-surface p-6 transition-transform duration-300 ease-in-out ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div>
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                Perfil
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar perfil"
                className="cursor-pointer rounded-full p-2 text-content-muted transition-colors duration-200 hover:bg-surface-hover"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="mb-4 flex justify-center">
              {staff.photo_url ? (
                <img
                  src={staff.photo_url}
                  alt={staff.name}
                  className="size-24 rounded-2xl object-cover ring-2 ring-border-strong"
                />
              ) : (
                <AvatarIcon size={96} className="text-content-muted" />
              )}
            </div>

            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <h2 id="staff-profile-title" className="font-display text-2xl font-bold text-content">
                {staff.name}
              </h2>
              <p className="text-sm text-content-muted">{roleLabel}</p>
              <Badge variant={staff.is_active ? 'success' : 'default'} size="sm">
                {staff.is_active && (
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-success"
                    aria-hidden="true"
                  />
                )}
                {staff.is_active ? 'Em Serviço' : 'Fora de Serviço'}
              </Badge>
            </div>

            <div className="mb-6 rounded-2xl bg-surface-raised p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                Email
              </p>
              <p className="mt-1 text-sm text-content">{staff.email}</p>
            </div>

            <Button
              onClick={handleToggleShift}
              isLoading={isTogglingShift}
              variant={staff.is_active ? 'danger' : 'primary'}
              fullWidth
            >
              {staff.is_active ? 'Fechar Turno' : 'Iniciar Turno'}
            </Button>

            {areaShortcuts.length > 0 && (
              <div className="mb-6 flex flex-col gap-2 pt-8">
                <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Atalhos
                </span>
                <div className="flex gap-2">
                  {areaShortcuts.map((shortcut) => (
                    <Button
                      key={shortcut.path}
                      size="sm"
                      variant="outline"
                      fullWidth
                      onClick={() => handleNavigateToArea(shortcut.path)}
                    >
                      {shortcut.label}
                      <ChevronIcon size={16} className="-rotate-90" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" fullWidth onClick={() => setShowLogoutConfirm(true)}>
            Terminar Sessão
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Terminar Sessão"
        description="Tens a certeza que pretendes terminar a sessão?"
        confirmText="Sim, sair"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
