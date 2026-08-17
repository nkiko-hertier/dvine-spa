import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Bell, Flower2, Menu, Moon, MoreHorizontal, Package, ShieldCheck, Sun, Users } from 'lucide-react';
import { fmtDate } from '@/lib/format';
import { LogoutButton } from '@/auth/LogoutButton';

const nav = [
  { href: '/workspace', label: 'Requests', icon: Bell },
  { href: '/workspace/analytics', label: 'Analytics', icon: Activity },
  { href: '/workspace/customers', label: 'Customers', icon: Users },
  { href: '/workspace/catalog', label: 'Catalog', icon: Package },
  { href: '/workspace/team', label: 'Team & audit', icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [dark, setDark] = useState(() => localStorage.getItem('dvine-theme') === 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('dvine-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="app-frame grain">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Flower2 size={19} />
          </div>
          <div>
            <strong>D'Vine</strong>
            <span>spa workspace</span>
          </div>
        </div>
        <div className="sidebar-rule" />
        <p className="sidebar-label">Workspace</p>
        <nav className="nav-list">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/workspace' ? location === '/workspace' : location.startsWith(href);
            return (
              <Link
                data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`nav-item ${active ? 'active' : ''}`}
                key={href}
              >
                <Icon size={17} />
                <span>{label}</span>
                {href === '/' && <span className="nav-ping" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="today-note">
            <span className="eyebrow">Today</span>
            <strong>{fmtDate(new Date().toISOString(), { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
            <span>Keep the room calm.</span>
          </div>
          <button data-testid="button-theme-toggle-sidebar" className="theme-toggle" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="staff-chip">
            <div className="avatar avatar-small">AM</div>
            <div>
              <strong>Ana Martins</strong>
              <span>Front desk lead</span>
            </div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>
      {mobileOpen && <button data-testid="button-close-mobile-nav" className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <main className="main-area">
        <header className="mobile-header">
          <button data-testid="button-open-mobile-nav" className="icon-button" onClick={() => setMobileOpen(true)}>
            <Menu size={19} />
          </button>
          <div className="brand mobile-brand">
            <div className="brand-mark">
              <Flower2 size={17} />
            </div>
            <strong>D'Vine</strong>
          </div>
          <button data-testid="button-theme-toggle-mobile" className="icon-button" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>
        <div className="signed-in-wrap">
          {children}
          <div className="shell-signout">
            <LogoutButton />
          </div>
        </div>
      </main>
    </div>
  );
}
