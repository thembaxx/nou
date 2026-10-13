import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nou · A little more present.",
  description:
    "Just today. That’s enough. Current weather, a playful 3D sky, and a little clarity for the day you’re in.",
  applicationName: "Nou",
  manifest: "/api/manifest?theme=light",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nou" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Nou · A little more present.",
    description: "The weather that matters. The day you’re in.",
    type: "website",
    images: [{ url: "/social.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nou · A little more present.",
    description: "No tomorrow. Just today.",
    images: ["/social.png"],
  },
  other: { "mobile-web-app-capable": "yes", "format-detection": "telephone=no" },
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
