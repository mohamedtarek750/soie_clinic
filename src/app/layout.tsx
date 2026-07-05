import type { Metadata, Viewport } from "next";
import "./app.css";

export const metadata: Metadata = {
  title: { default: "Soie Clinic", template: "%s | Soie Clinic" },
  description:
    "Soie Clinic, a luxury aesthetic clinic in New Cairo and Mohandseen. Patient accounts, online booking and clinic management.",
  robots: { index: false }, // app pages (auth/account/admin) stay out of search; the marketing site has its own SEO
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F3EE",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Reuse the marketing site's design tokens and fonts so the app
            side of Soie is visually identical to the public site. */}
        <link rel="icon" type="image/png" href="/assets/images/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Manrope:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
