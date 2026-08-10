import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { EyeIcon, EyeOffIcon } from '../../../components/icons';
import LogoIcon from '../../../components/icons/Logo';
import Button from '../../../components/ui/button/Button';
import Input from '../../../components/ui/input/Input';
import { ApiError } from '../../../services/api/client';
import { ROLE_HOME_ROUTE, useAuth } from '../hooks/AuthContext';

export function LoginPage() {
  const { staff, isLoading, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  if (isLoading) {
    return null;
  }

  if (staff !== null) {
    return <Navigate to={ROLE_HOME_ROUTE[staff.role]} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const staff = await login(email, password);

      navigate(ROLE_HOME_ROUTE[staff.role], {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Erro ao iniciar sessão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh bg-background md:grid-cols-[2fr_3fr]">
      {/* Left column — desktop only */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0b1118] md:block">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,84,94,0.10)_0%,rgba(29,23,29,0.95)_35%,rgba(11,17,24,1)_100%)]"
        />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col px-10 py-8 lg:px-12">
          <LogoIcon className="w-52 lg:w-64" />

          <div className="flex flex-1 flex-col justify-center">
            <p className="font-display text-5xl leading-[1.08] font-bold text-content-muted lg:text-6xl">
              Waiter.
              <br />
              Kitchen.
              <br />
              Manager.
            </p>

            <p className="mt-4 text-lg text-content-subtle">One portal. Every role.</p>
          </div>
        </div>
      </section>

      {/* Right column */}
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-12 sm:px-8 md:min-h-screen lg:px-12">
        {/* Mobile gradient only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_18%,var(--color-background))_0%,color-mix(in_srgb,var(--color-primary)_8%,var(--color-background))_28%,var(--color-background)_68%)] md:hidden"
        />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              Staff Portal
            </p>

            <h1 className="mt-2 text-3xl font-bold text-content sm:text-4xl">Staff Access</h1>

            <p className="mt-2 text-content-subtle">Sign in to continue to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              className="lg:h-12 md:text-base"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <Input
              label="Password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              className="lg:h-12 md:text-base"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

            {error && (
              <p role="alert" aria-live="polite" className="text-sm text-danger">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
              className="mt-2"
            >
              {isSubmitting ? 'Signing in...' : 'Login'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
