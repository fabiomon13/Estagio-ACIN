import { useState } from 'react';
import type { FormEvent } from 'react';
import { EyeIcon, EyeOffIcon } from '../../../components/icons';
import Button from '../../../components/ui/button/Button';
import Input from '../../../components/ui/input/Input';
import Radio from '../../../components/ui/radio/Radio';
import { useToast } from '../../../components/ui/toast/useToast';
import { apiFetch } from '../../../services/api/client';
import type { AuthStaff, StaffRole } from '../../auth/hooks/AuthContext';
import { StaffListTable } from '../components/StaffListTable';
import { getAdminCreateStaffError } from '../utils/adminErrors';

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'waiter', label: 'Waiter' },
  { value: 'chef', label: 'Chef' },
  { value: 'admin', label: 'Admin' },
];

type AdminPageView = 'create' | 'list';

export function AdminPage() {
  const { showToast } = useToast();

  const [view, setView] = useState<AdminPageView>('create');
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
    <div className="flex flex-col p-5">
      <h1 className="text-content text-2xl">Gestão de staff</h1>
      <p className="mt-1 pb-5 text-content-subtle">
        Cria novas contas de staff ou consulta as contas já existentes.
      </p>

      <div className="mb-5 flex gap-2">
        <Button
          variant={view === 'create' ? 'primary' : 'outline'}
          onClick={() => setView('create')}
        >
          Criar Staff
        </Button>
        <Button variant={view === 'list' ? 'primary' : 'outline'} onClick={() => setView('list')}>
          Ver Staff
        </Button>
      </div>

      {view === 'list' && <StaffListTable />}

      {view === 'create' && (
        <div className="w-full max-w-xl rounded-xl border border-border bg-surface p-5 sm:p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      )}
    </div>
  );
}
