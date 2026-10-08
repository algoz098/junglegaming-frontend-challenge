import { Link } from '@tanstack/react-router';
import { Shield, Star, Bell, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40 backdrop-blur-sm">
      <div className="container py-12">
        <div className="grid gap-8 rounded-2xl border border-border bg-card/60 p-6 md:grid-cols-3">
          <Feature
            icon={<Shield className="h-5 w-5" />}
            title="Segurança da carteira"
            description="Proteja sua carteira e colecione arte digital verificada com confiança."
          />
          <Feature
            icon={<Star className="h-5 w-5" />}
            title="Criadores em destaque"
            description="Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede."
          />
          <Feature
            icon={<Bell className="h-5 w-5" />}
            title="Alertas de lançamentos"
            description="Receba calendários de castings, novidades de listas de espera e análises do mercado."
          />
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h2 className="font-display text-xl font-bold text-foreground">Antecipe-se ao próximo lançamento</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
            <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <Input
                type="email"
                placeholder="Digite seu e-mail…"
                aria-label="Seu e-mail para receber novidades"
                required
              />
              <Button type="submit" variant="primary">
                Enviar
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-4">
          <div>
            <Logo />
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wider">Meu perfil</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/profile" className="hover:text-primary">Meu perfil</Link></li>
              <li><Link to="/profile" className="hover:text-primary">Minha coleção</Link></li>
              <li><Link to="/profile" className="hover:text-primary">Atividade</Link></li>
              <li><Link to="/profile" className="hover:text-primary">Estúdio do criador</Link></li>
              <li><Link to="/profile" className="hover:text-primary">Lista de interesse</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Central de ajuda</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Central de ajuda</li>
              <li>Como comprar NFTs</li>
              <li>Carteira e segurança</li>
              <li>Política do mercado</li>
              <li>Denunciar item</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Coleções</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Arte digital</li>
              <li>Fotografia</li>
              <li>Música</li>
              <li>Arte 3D</li>
              <li>Utilidade</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Redes sociais</h3>
            <ul className="mt-3 flex gap-2 text-muted-foreground">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <li key={i}>
                  <a
                    href="#"
                    aria-label="Rede social"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:border-primary hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider">Carteiras compatíveis</h3>
            <p className="mt-2 text-xs text-muted-foreground">MetaMask · WalletConnect · Ethereum</p>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </div>
    </footer>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}