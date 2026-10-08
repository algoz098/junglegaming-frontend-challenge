import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { Eye, EyeOff } from 'lucide-react';
import { useLogin } from '@/hooks/use-auth';
import { isApiError } from '@/api/client';

export const Route = createFileRoute('/login')({
  validateSearch: (search) => ({ redirect: typeof search.redirect === 'string' ? search.redirect : undefined }),
  component: LoginPage,
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('contato@mail.com');
  const [password, setPassword] = useState('123456');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const login = useLogin();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          toast.success('Bem-vindo de volta à Kurio.');
          navigate({ to: (search.redirect as never) ?? '/' });
        },
        onError: (err: unknown) => {
          if (isApiError(err) && err.fields) setErrors(err.fields);
          toast.error((err as { message?: string })?.message ?? 'Não foi possível autenticar.');
        },
      },
    );
  };

  return (
    <section className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold">Entrar</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <Field label="E-mail" htmlFor="login-email" required error={errors.email}>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@mail.com"
              autoComplete="email"
              required
              invalid={Boolean(errors.email)}
            />
          </Field>
          <Field label="Senha" htmlFor="login-password" required error={errors.password}>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="**********"
                autoComplete="current-password"
                className="pr-10"
                required
                minLength={6}
                invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <div className="flex justify-end">
            <Link to="/" className="text-xs text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </Button>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> Ou continue com <span className="h-px flex-1 bg-border" />
          </div>
          <SocialButton provider="google" disabled>Continuar com Google</SocialButton>
          <SocialButton provider="facebook" disabled>Continuar com Facebook</SocialButton>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Novo na Kurio?{' '}
          <Link
            to="/register"
            search={{ redirect: search.redirect }}
            className="text-primary hover:underline"
          >
            Crie uma conta
          </Link>
        </p>
      </div>
    </section>
  );
}

function SocialButton({
  children,
  provider,
  disabled,
}: {
  children: React.ReactNode;
  provider: 'google' | 'facebook';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border bg-transparent text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden className="text-base">
        {provider === 'google' ? '🟢' : '🟦'}
      </span>
      {children}
    </button>
  );
}