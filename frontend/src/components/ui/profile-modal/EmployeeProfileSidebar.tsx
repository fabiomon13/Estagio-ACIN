import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../confirm-dialog/ConfirmDialog';
import Button from '../button/Button';
import { useAuth } from '../../../features/auth/hooks/useAuth';

interface EmployeeProfileSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function EmployeeProfileSidebar({
  isOpen = true,
  onClose,
}: EmployeeProfileSidebarProps) {
  const { staff, logout } = useAuth();

  const [isWorking, setIsWorking] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  if (!isOpen || !staff) return null;

  const handleConfirmLogout = async () => {
    try {
      setShowLogoutConfirm(false);

      await logout();

      if (onClose) {
        onClose();
      }

      navigate('/login');
    } catch (error) {
      console.error('Erro ao terminar sessão:', error);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-hidden"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        <div
          className="absolute inset-0 transition-opacity"
          style={{ backgroundColor: 'rgba(13, 20, 25, 0.75)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />

        <div
          className="absolute inset-y-0 right-0 max-w-sm w-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-in-out"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-content)',
            borderLeft: '2px solid var(--color-border-strong)',
          }}
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Perfil do Utilizador
              </span>
              <svg
                onClick={onClose}
                className="w-4 h-4 cursor-pointer transition-colors"
                style={{ color: 'var(--color-content-muted)' }}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <div className="flex justify-center mb-4">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop"
                alt={staff.name}
                className="w-24 h-24 rounded-2xl object-cover shadow-md"
                style={{ border: '2px solid var(--color-border)' }}
              />
            </div>
            <div className="text-center mb-4">
              <h2
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-content)' }}
              >
                {staff.name}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-content-muted)' }}>
                {staff.role} <span className="mx-1">·</span> Restaurante Tavola - Funchal
              </p>
            </div>

            <div className="flex justify-center gap-2 mb-6">
              {isWorking ? (
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm"
                  style={{
                    backgroundColor: 'var(--color-success)',
                    color: 'var(--color-background)',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: 'var(--color-background)' }}
                  ></span>
                  Em Serviço
                </span>
              ) : (
                <span
                  className="text-xs font-medium px-3 py-1 rounded-full border"
                  style={{
                    backgroundColor: 'var(--color-surface-raised)',
                    color: 'var(--color-content-muted)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  Fora de Serviço
                </span>
              )}
              <span
                className="text-xs font-medium px-3 py-1 rounded-full border"
                style={{
                  backgroundColor: 'var(--color-surface-raised)',
                  color: 'var(--color-content-muted)',
                  borderColor: 'var(--color-border)',
                }}
              >
                Madeira
              </span>
            </div>

            <div
              className="rounded-2xl p-4 mb-6 shadow-inner border"
              style={{
                backgroundColor: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
              }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-content)' }}>
                Contactos
              </h3>

              <div className="space-y-3 text-xs">
                <div
                  className="flex justify-between items-center"
                  style={{ color: 'var(--color-content-muted)' }}
                >
                  <span className="flex items-center gap-2">Email</span>
                  <span className="underline font-medium" style={{ color: 'var(--color-content)' }}>
                    {staff.email}
                  </span>
                </div>

                <div
                  className="flex justify-between items-center"
                  style={{ color: 'var(--color-content-muted)' }}
                >
                  <span className="flex items-center gap-2">Telemóvel</span>
                  <span className="font-medium" style={{ color: 'var(--color-content)' }}>
                    +351 000000000
                  </span>
                </div>

                <div
                  className="flex justify-between items-center"
                  style={{ color: 'var(--color-content-muted)' }}
                >
                  <span className="flex items-center gap-2">Unidade</span>
                  <span className="font-medium" style={{ color: 'var(--color-content)' }}>
                    Sala Principal
                  </span>
                </div>

                <div
                  className="flex justify-between items-center"
                  style={{ color: 'var(--color-content-muted)' }}
                >
                  <span className="flex items-center gap-2">Admissão</span>
                  <span className="font-medium" style={{ color: 'var(--color-content)' }}>
                    14 / 05 / 2021
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                onClick={() => setIsWorking(false)}
                style={{
                  backgroundColor: !isWorking ? 'var(--color-primary)' : 'transparent',
                  color: !isWorking ? 'var(--color-back)' : 'var(--color-content)',
                  border: !isWorking ? 'none' : '1px solid var(--color-border)',
                }}
              >
                Fechar Turno
              </Button>
              <Button
                onClick={() => setIsWorking(true)}
                style={{
                  backgroundColor: isWorking ? 'var(--color-danger)' : 'transparent',
                  color: isWorking ? '#f7f8fa' : 'var(--color-content-muted)',
                  border: isWorking ? 'none' : '1px solid var(--color-border)',
                }}
              >
                Iniciar Turno
              </Button>
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full font-medium text-sm py-3 rounded-2xl transition-all cursor-pointer text-center"
              style={{
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-content)',
                border: '1px solid var(--color-border)',
              }}
            >
              Log out
            </Button>

            <div className="flex justify-center pt-1">
              <svg
                onClick={onClose}
                className="w-4 h-4 cursor-pointer transition-colors"
                style={{ color: 'var(--color-content-muted)' }}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Terminar Sessão"
        description="Tens a certeza que pretendes terminar a sessão e regressar ao ecrã de login?"
        confirmText="Sim, sair"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
