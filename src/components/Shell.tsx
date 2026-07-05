import { LogoutButton } from "./LogoutButton";

export type NavItem = { href: string; label: string; icon: React.ReactNode };

export function Shell({
  nav,
  active,
  userName,
  title,
  actions,
  children,
}: {
  nav: NavItem[];
  active: string;
  userName: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <aside className="shell__side">
        <a className="shell__brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/images/logo-cream.png" alt="Soie Clinic" />
          <span>Clinic</span>
        </a>
        <nav className="shell__nav">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className={`shell__link${active === item.href ? " is-active" : ""}`}>
              {item.icon}
              {item.label}
            </a>
          ))}
        </nav>
        <div className="shell__foot">
          <LogoutButton />
        </div>
      </aside>
      <main className="shell__main">
        <div className="shell__topbar">
          <h1>{title}</h1>
          <div className="shell__user">
            <span>{userName}</span>
            {actions}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

export const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z"/></svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>
  ),
  doctors: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1.2-3.5 3.8-5 6.5-5s5.3 1.5 6.5 5"/><path d="M17 4v6M14 7h6"/></svg>
  ),
  sparkle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5z"/></svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>
  ),
  money: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/></svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/></svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M4 4h16v12l-4 4H4z"/><path d="M4 12h5l1.5 2h3L15 12h5"/></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3l8 3.5v5c0 5-3.5 8.5-8 9.5-4.5-1-8-4.5-8-9.5v-5z"/><path d="M9 12l2 2 4-4.5"/></svg>
  ),
};
