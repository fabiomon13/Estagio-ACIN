import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/button/Button';
import Input from '../../../components/ui/input/Input';
import { ApiError } from '../../../services/api/client';
import { ROLE_HOME_ROUTE, useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const staff = await login(email, password);
      navigate(ROLE_HOME_ROUTE[staff.role], { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Erro ao iniciar sessão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-4 max-w-sm">
      <h1>Login</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'A entrar...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
