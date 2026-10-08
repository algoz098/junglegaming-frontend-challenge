import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Camera, Trash2 } from 'lucide-react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/input';
import { useAuth, useLogout } from '@/hooks/use-auth';
import {
  useChangePassword,
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
} from '@/hooks/use-profile';
import { getSessionToken, isApiError } from '@/api/client';

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ location }) => {
    if (!getSessionToken()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      });
    }
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { isAuthenticated } = useAuth();
  const profile = useProfile();
  const update = useUpdateProfile();
  const changePwd = useChangePassword();
  const uploadAvatar = useUploadAvatar();
  const logout = useLogout();
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});

  if (!isAuthenticated || !profile.data) {
    return (
      <section className="container py-10">
        <div className="card-surface p-8 text-center">Carregando perfil…</div>
      </section>
    );
  }

  const user = profile.data;

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success('Avatar atualizado.'),
      onError: () => toast.error('Falha ao atualizar avatar.'),
    });
  };

  const onProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileErrors({});
    const fd = new FormData(e.currentTarget);
    update.mutate(
      {
        displayName: String(fd.get('displayName') || ''),
        username: String(fd.get('username') || ''),
        email: String(fd.get('email') || ''),
        ensName: String(fd.get('ensName') || ''),
      },
      {
        onSuccess: () => toast.success('Perfil atualizado.'),
        onError: (err: unknown) => {
          if (isApiError(err) && err.fields) setProfileErrors(err.fields);
          toast.error((err as { message?: string })?.message ?? 'Falha ao salvar.');
        },
      },
    );
  };

  return (
    <section className="container py-10">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <SidebarNav active="profile" />
        <div className="space-y-8">
          <div className="card-surface p-6">
            <h1 className="font-display text-2xl font-bold">Perfil do colecionador</h1>
            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onProfileSubmit} noValidate>
              <Field label="Nome de exibição" htmlFor="displayName" required error={profileErrors.displayName}>
                <Input id="displayName" name="displayName" defaultValue={user.displayName} required invalid={Boolean(profileErrors.displayName)} />
              </Field>
              <Field label="Nome de usuário" htmlFor="username" required error={profileErrors.username}>
                <Input id="username" name="username" defaultValue={user.username} required invalid={Boolean(profileErrors.username)} />
              </Field>
              <Field label="E-mail" htmlFor="email" required error={profileErrors.email}>
                <Input id="email" name="email" type="email" defaultValue={user.email} required invalid={Boolean(profileErrors.email)} />
              </Field>
              <Field label="Nome ENS" htmlFor="ensName" hint="Opcional" error={profileErrors.ensName}>
                <Input
                  id="ensName"
                  name="ensName"
                  defaultValue={user.ensName ?? ''}
                  prefix={<span className="text-xs">.eth</span>}
                  invalid={Boolean(profileErrors.ensName)}
                />
              </Field>

              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Avatar</p>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-xl text-primary">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      user.displayName?.[0]?.toUpperCase() ?? 'K'
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label className="inline-flex h-11 items-center gap-2 rounded-md border border-primary bg-primary/10 px-4 text-sm font-semibold text-primary hover:bg-primary/20 cursor-pointer">
                      <Camera className="h-4 w-4" />
                      Alterar
                      <input type="file" accept="image/*" hidden onChange={onAvatarChange} />
                    </label>
                    <button
                      type="button"
                      className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-secondary"
                      onClick={() => toast.info('Remoção de avatar não disponível no demo.')}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>

          <PasswordSection
            errors={pwdErrors}
            onSubmit={(payload) => {
              setPwdErrors({});
              changePwd.mutate(payload, {
                onSuccess: () => toast.success('Senha alterada.'),
                onError: (err: unknown) => {
                  if (isApiError(err) && err.fields) setPwdErrors(err.fields);
                  toast.error((err as { message?: string })?.message ?? 'Falha ao alterar senha.');
                },
              });
            }}
            submitting={changePwd.isPending}
          />

          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-bold">Sessão</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Encerrar sessão limpa dados privados em cache, subscriptions e redireciona para o login.
            </p>
            <Button
              variant="danger"
              className="mt-4"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              Sair da conta
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PasswordSection({
  onSubmit,
  submitting,
  errors,
}: {
  onSubmit: (payload: { currentPassword: string; newPassword: string }) => void;
  submitting: boolean;
  errors: Record<string, string>;
}) {
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [confirmError, setConfirmError] = useState<string | undefined>();

  return (
    <div className="card-surface p-6">
      <h2 className="font-display text-lg font-bold">Alterar senha</h2>
      <form
        className="mt-4 grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const currentPassword = String(fd.get('currentPassword') || '');
          const newPassword = String(fd.get('newPassword') || '');
          const confirm = String(fd.get('confirmPassword') || '');
          if (newPassword !== confirm) {
            setConfirmError('Confirmação não confere com a nova senha.');
            return;
          }
          setConfirmError(undefined);
          onSubmit({ currentPassword, newPassword });
          (e.target as HTMLFormElement).reset();
        }}
      >
        <Field label="Senha atual" htmlFor="currentPassword" required error={errors.currentPassword}>
          <div className="relative">
            <Input
              id="currentPassword"
              name="currentPassword"
              type={show.current ? 'text' : 'password'}
              className="pr-10"
              autoComplete="current-password"
              required
              invalid={Boolean(errors.currentPassword)}
            />
            <ShowHide open={show.current} onToggle={() => setShow((s) => ({ ...s, current: !s.current }))} />
          </div>
        </Field>
        <div />
        <Field label="Nova senha" htmlFor="newPassword" required error={errors.newPassword}>
          <div className="relative">
            <Input
              id="newPassword"
              name="newPassword"
              type={show.next ? 'text' : 'password'}
              className="pr-10"
              autoComplete="new-password"
              minLength={6}
              required
              invalid={Boolean(errors.newPassword)}
            />
            <ShowHide open={show.next} onToggle={() => setShow((s) => ({ ...s, next: !s.next }))} />
          </div>
        </Field>
        <Field label="Confirmar nova senha" htmlFor="confirmPassword" required error={confirmError ?? errors.confirmPassword}>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={show.confirm ? 'text' : 'password'}
              className="pr-10"
              autoComplete="new-password"
              minLength={6}
              required
              invalid={Boolean(confirmError ?? errors.confirmPassword)}
            />
            <ShowHide open={show.confirm} onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} />
          </div>
        </Field>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Alterando…' : 'Salvar nova senha'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ShowHide({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Ocultar' : 'Mostrar'}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
    >
      {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}