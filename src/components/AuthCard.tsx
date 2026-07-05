export function AuthCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <a href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/images/logo.png" alt="Soie Clinic" className="auth-card__logo" />
        </a>
        <h1>{title}</h1>
        <p className="auth-card__sub">{sub}</p>
        {children}
      </div>
    </main>
  );
}
