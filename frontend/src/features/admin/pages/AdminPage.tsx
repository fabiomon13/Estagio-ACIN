import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import ChevronIcon from '../../../components/icons/ChevronIcon';
import { EyeIcon, EyeOffIcon } from '../../../components/icons';
import Button from '../../../components/ui/button/Button';
import Input from '../../../components/ui/input/Input';
import Radio from '../../../components/ui/radio/Radio';
import { useToast } from '../../../components/ui/toast/useToast';
import { apiFetch } from '../../../services/api/client';
import type { AuthStaff, StaffRole } from '../../auth/hooks/AuthContext';
import { getAdminCreateStaffError } from '../utils/adminErrors';

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'waiter', label: 'Waiter' },
  { value: 'chef', label: 'Chef' },
  { value: 'admin', label: 'Admin' },
];

export function AdminPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [role, setRole] = useState<StaffRole>('waiter');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const staff = await apiFetch<AuthStaff>('/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      showToast({
        variant: 'success',
        title: 'Conta criada',
        description: `${staff.name} (${staff.email}, ${staff.role})`,
      });
      setName('');
      setEmail('');
      setPassword('');
      setRole('waiter');
    } catch (err) {
      setError(getAdminCreateStaffError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-3 md:gap-5">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Staff Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold text-content sm:text-4xl">Admin</h1>
        </div>

        <div className="md:flex justify-between items-center">
          <p className="text-content-subtle text-md">
            Gere os acessos da equipa e cria novas contas para os diferentes espaços da aplicação.
          </p>
          <nav className="flex flex-wrap gap-3 pt-7 md:pt-0" aria-label="Atalhos">
            <Button variant="outline" size="sm" onClick={() => navigate('/staff')}>
              Ir para Staff
              <ChevronIcon size={16} className="-rotate-90" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/kitchen')}>
              Ir para Cozinha
              <ChevronIcon size={16} className="-rotate-90" />
            </Button>
          </nav>
        </div>
        <div className="w-full h-0.5 bg-border rounded-full"></div>
      </header>

      <div className="flex flex-col justify-center items-center mt-6">
        <div className="w-full max-w-xl rounded-xl border border-border bg-surface-raised p-5 sm:p-6 md:p-8">
          <h2 className="text-lg font-semibold text-content">Criar conta de staff</h2>
          <p className="mt-1 text-sm text-content-subtle">
            Cria uma nova conta de staff com acesso à cozinha, ao serviço de mesas ou à
            administração.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <Input
              label="Password"
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              helperText="Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo."
              required
              endAdornment={
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={isPasswordVisible}
                  className="flex size-5 items-center justify-center text-content-subtle transition-colors hover:text-content"
                >
                  {isPasswordVisible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              }
            />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-content">Função</span>
              <div className="flex gap-2">
                {ROLE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={`p-4 w-full rounded-xl items-center ${role === option.value ? 'border border-primary/40 bg-primary/10' : 'border border-border bg-surface'}`}
                  >
                    <Radio
                      name="staff-role"
                      label={option.label}
                      checked={role === option.value}
                      onChange={() => setRole(option.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p role="alert" aria-live="polite" className="text-sm text-danger">
                {error}
              </p>
            )}

            <Button
              className="mt-6"
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? 'A criar...' : 'Criar conta'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
