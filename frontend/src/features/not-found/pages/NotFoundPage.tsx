import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/button/Button';
import notFoundIllustration from '../../../assets/not-found.svg';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-12">
      {/* Background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-144 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px]"
      />

      {/* Dot pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,var(--color-border-strong)_1.2px,transparent_1.2px)] bg-size-[28px_28px] opacity-35"
      />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-4xl items-center">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-12">
          {/* Content */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="text-sm font-semibold tracking-[0.3em] text-primary uppercase">
              Error 404
            </p>

            <h1 className="mt-5 text-6xl font-extrabold tracking-[0.18em] text-content sm:text-7xl lg:text-8xl">
              404
            </h1>

            <h2 className="mt-6 max-w-xl text-3xl font-semibold text-content sm:text-4xl">
              This page isn&apos;t on the menu
            </h2>

            <p className="mt-4 max-w-md text-base leading-7 text-content-muted">
              The page you&apos;re looking for doesn&apos;t exist, may have been moved, or is no
              longer available.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                variant="primary"
                className="w-full whitespace-nowrap sm:w-auto"
                onClick={() => navigate('/login')}
              >
                Back to login
              </Button>

              <Button
                variant="ghost"
                className="w-full whitespace-nowrap sm:w-auto"
                onClick={() => navigate(-1)}
              >
                Go back
              </Button>
            </div>
          </div>

          {/* Illustration */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute size-88 rounded-full bg-primary/15 blur-[120px] sm:size-112"
            />

            <img
              src={notFoundIllustration}
              alt="Page not found"
              className="w-full max-w-md object-contain"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
