import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { Eye, EyeOff } from 'lucide-react';
import { useRegister } from '@/hooks/use-auth';
import { isApiError } from '@/api/client';

export const Route = createFileRoute('/register')({
  validateSearch: (search) => ({ redirect: typeof search.redirect === 'string' ? search.redirect : undefined }),
  component: RegisterPage,
});

function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const register = useRegister();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setConfirmError(undefined);
    if (password !== confirm) {
      setConfirmError('As senhas precisam coincidir.');
      return;
    }
    register.mutate(
      { displayName, username, email, password },
      {
        onSuccess: () => {
          toast.success('Conta criada! Bem-vindo à Kurio.');
          navigate({ to: (search.redirect as never) ?? '/' });
        },
        onError: (err: unknown) => {
          if (isApiError(err) && err.fields) setErrors(err.fields);
          toast.error((err as { message?: string })?.message ?? 'Falha no cadastro.');
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
        <h1 className="mt-6 text-center font-display text-2xl font-bold">Criar perfil de colecionador</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <Field label="Nome de exibição" htmlFor="reg-display" required error={errors.displayName}>
            <Input id="reg-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required invalid={Boolean(errors.displayName)} />
          </Field>
          <Field label="Nome de usuário" htmlFor="reg-username" required error={errors.username}>
            <Input
              id="reg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
              invalid={Boolean(errors.username)}
            />
          </Field>
          <Field label="Digite seu e-mail" htmlFor="reg-email" required error={errors.email}>
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              invalid={Boolean(errors.email)}
            />
          </Field>
          <Field label="Senha" htmlFor="reg-password" required error={errors.password}>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                autoComplete="new-password"
                minLength={6}
                required
                invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirmar senha" htmlFor="reg-confirm" required error={confirmError ?? errors.confirm}>
            <div className="relative">
              <Input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pr-10"
                autoComplete="new-password"
                minLength={6}
                required
                invalid={Boolean(confirmError ?? errors.confirm)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={register.isPending}>
            {register.isPending ? 'Criando…' : 'Criar perfil'}
          </Button>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> Ou continue com <span className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            disabled
            className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border bg-transparent text-sm hover:bg-secondary disabled:opacity-60"
          >
            <span aria-hidden>🟢</span> Continuar com Google
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border bg-transparent text-sm hover:bg-secondary disabled:opacity-60"
          >
            <span aria-hidden>🟦</span> Continuar com Facebook
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link to="/login" search={search} className="text-primary hover:underline">
            Entre
          </Link>
        </p>
      </div>
    </section>
  );
}