import { Link } from '@tanstack/react-router';
import {
  User,
  Shield,
  Activity,
  Heart,
  Tag,
  Download,
  LifeBuoy,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'profile', label: 'Dados do perfil', icon: User, to: '/profile' },
  { id: 'wallets', label: 'Carteiras', icon: Shield, to: '/wallets' },
  { id: 'activity', label: 'Atividade', icon: Activity, to: '/profile' },
  { id: 'wishlist', label: 'Lista de interesse', icon: Heart, to: '/profile' },
  { id: 'offers', label: 'Ofertas', icon: Tag, to: '/profile' },
  { id: 'downloads', label: 'Arquivos baixados', icon: Download, to: '/profile' },
  { id: 'support', label: 'Suporte', icon: LifeBuoy, to: '/profile' },
  { id: 'logout', label: 'Sair', icon: LogOut, to: '/login' },
] as const;

interface SidebarNavProps {
  active?: (typeof SECTIONS)[number]['id'];
}

export function SidebarNav({ active = 'profile' }: SidebarNavProps) {
  return (
    <aside
      aria-label="Navegação do meu perfil"
      className="w-full shrink-0 rounded-2xl border border-border bg-card/80 p-5 md:w-64"
    >
      <h2 className="mb-4 font-display text-lg font-semibold">Meu perfil</h2>
      <ul className="flex flex-col gap-1">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;
          return (
            <li key={section.id}>
              <Link
                to={section.to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'border-l-2 border-primary bg-primary/10 text-primary'
                    : 'text-foreground/80 hover:bg-secondary hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}