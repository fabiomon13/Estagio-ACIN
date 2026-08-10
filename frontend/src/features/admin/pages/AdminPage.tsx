import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../../../components/ui/button/Button';
import Input from '../../../components/ui/input/Input';
import Radio from '../../../components/ui/radio/Radio';
import { ApiError, apiFetch } from '../../../services/api/client';
import type { AuthStaff, StaffRole } from '../../auth/hooks/AuthContext';

export function AdminPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [error, setError] = useState<string | null>(null);
  const [createdStaff, setCreatedStaff] = useState<AuthStaff | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setCreatedStaff(null);
    setIsSubmitting(true);

    try {
      const staff = await apiFetch<AuthStaff>('/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      setCreatedStaff(staff);
      setName('');
      setEmail('');
      setPassword('');
      setRole('waiter');
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Erro ao criar conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-4 max-w-sm">
      <h1>Admin</h1>

      <h2 className="font-semibold">Create staff account (test form)</h2>

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
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <div className="flex flex-col gap-2">
          <Radio
            name="staff-role"
            label="Waiter"
            checked={role === 'waiter'}
            onChange={() => setRole('waiter')}
          />
          <Radio
            name="staff-role"
            label="Chef"
            checked={role === 'chef'}
            onChange={() => setRole('chef')}
          />
          <Radio
            name="staff-role"
            label="Admin"
            checked={role === 'admin'}
            onChange={() => setRole('admin')}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {createdStaff && (
          <p className="text-green-500 text-sm">
            Created: {createdStaff.name} ({createdStaff.email}, {createdStaff.role})
          </p>
        )}

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create staff'}
        </Button>
      </form>
    </div>
  );
}
