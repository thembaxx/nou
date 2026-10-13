import type { Metadata, Viewport } from "next";
import { absoluteUrl, BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.origin),
  title: { default: BRAND.title, template: "%s · Nou" },
  description: BRAND.description,
  applicationName: BRAND.name,
  category: "weather",
  alternates: { canonical: absoluteUrl() },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/api/manifest?theme=light",
  appleWebApp: { capable: true, statusBarStyle: "default", title: BRAND.name },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: BRAND.title,
    description: BRAND.description,
    siteName: BRAND.name,
    url: absoluteUrl(),
    locale: "en_GB",
    type: "website",
    images: [
      {
        url: "/social.png",
        width: 1200,
        height: 630,
        alt: "Nou. Weather for now. A calm weather app for the day you’re in.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.title,
    description: BRAND.description,
    images: [{ url: "/social.png", alt: "Nou — Weather for now." }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
    llms: absoluteUrl("/llms.txt"),
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f4ef",
  colorScheme: "light dark",
};

const themeScript = `(function(){try{var pref=JSON.parse(localStorage.getItem('nou-theme')||'"auto"'),ctx=JSON.parse(localStorage.getItem('nou-theme-context')||'null'),now=Date.now(),day;if(ctx&&now<ctx.sunset+43200000&&now>ctx.sunrise-43200000){day=now>=ctx.sunrise&&now<ctx.sunset}else{var hour=ctx&&ctx.timezone?Number(new Intl.DateTimeFormat('en-GB',{timeZone:ctx.timezone,hour:'numeric',hourCycle:'h23'}).format(now)):new Date().getHours();day=hour>=7&&hour<19}var dark=pref==='dark'||(pref==='auto'&&!day),color=dark?'#141614':'#f5f4ef';document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=color})}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="Nou information for AI assistants"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          rel="preload"
          href="/fonts/manrope.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to today’s weather
        </a>
        {children}
      </body>
    </html>
  );
}
