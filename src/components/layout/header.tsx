import { Link, useNavigate } from '@tanstack/react-router';
import { Search, ShoppingCart, User, LogOut } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { useAuth, useLogout } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { useState } from 'react';
import { toast } from 'sonner';

type NavItemId = 'inicio' | 'mercado' | 'criadores' | 'aprenda';

interface NavItem {
  id: NavItemId;
  label: string;
  pathname?: '/';
  search?: Record<string, unknown>;
  outOfScope?: boolean;
  outOfScopeMessage?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'inicio', label: 'Início', pathname: '/' },
  {
    id: 'mercado',
    label: 'Mercado',
    pathname: '/',
    search: { sort: 'trending' },
  },
  {
    id: 'criadores',
    label: 'Criadores',
    outOfScope: true,
    outOfScopeMessage: 'Página de criadores em breve.',
  },
  {
    id: 'aprenda',
    label: 'Aprenda',
    outOfScope: true,
    outOfScopeMessage: 'Central educativa em breve.',
  },
];

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const cart = useCart();
  const logout = useLogout();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount = cart.data?.items.reduce((acc, i) => acc + i.quantity, 0) ?? 0;
  const first = user?.displayName?.[0]?.toUpperCase() ?? 'K';

  const handleNav = (item: NavItem) => {
    if (item.outOfScope) {
      toast.info(item.outOfScopeMessage ?? 'Em breve.');
      return;
    }
    void navigate({ to: item.pathname ?? '/', search: item.search });
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" aria-label="Kurio, ir para a página inicial">
          <Logo />
        </Link>

        <nav aria-label="Navegação principal" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => {
              if (item.outOfScope) {
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNav(item)}
                      className="nav-link"
                    >
                      {item.label}
                    </button>
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <Link
                    to={item.pathname ?? '/'}
                    search={item.search}
                    onClick={() => handleNav(item)}
                    activeOptions={{ exact: true, includeSearch: true }}
                    activeProps={{ className: 'nav-link active', 'aria-current': 'page' }}
                    inactiveProps={{ className: 'nav-link', 'aria-current': undefined }}
                    className="nav-link"
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.info('Busca em breve. Use os filtros do catálogo.')}
            className="rounded-md p-2 text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Buscar NFTs"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            to="/cart"
            className="relative rounded-md p-2 text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Carrinho de NFTs, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((s) => !s)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-sm font-semibold text-primary hover:border-primary"
              >
                {first}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  onMouseLeave={() => setMenuOpen(false)}
                  className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-card p-1 shadow-xl"
                >
                  <div className="px-3 py-2 text-xs text-muted-foreground">{user?.email}</div>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-secondary"
                  >
                    <User className="h-4 w-4" /> Meu perfil
                  </Link>
                  <Link
                    to="/wallets"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-secondary"
                  >
                    Carteiras
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout.mutate();
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-secondary"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild variant="primary" size="md">
              <Link to="/login" search={{ redirect: undefined }} aria-label="Entrar na sua conta">
                <User className="h-4 w-4" />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}