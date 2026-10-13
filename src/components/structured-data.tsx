import { absoluteUrl, BRAND } from "@/lib/brand";

const data = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Brand",
      "@id": absoluteUrl("/#brand"),
      name: BRAND.name,
      slogan: BRAND.tagline,
      url: absoluteUrl(),
      logo: absoluteUrl("/brand/symbol.svg"),
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: BRAND.name,
      alternateName: "Nou Weather",
      url: absoluteUrl(),
      description: BRAND.description,
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      "@id": absoluteUrl("/#app"),
      name: BRAND.name,
      url: absoluteUrl(),
      description: BRAND.description,
      applicationCategory: "UtilitiesApplication",
      applicationSubCategory: "Weather",
      operatingSystem: "iOS, Android, Windows, macOS, Linux",
      browserRequirements:
        "A modern browser with JavaScript. WebGL is optional; a static sky illustration is available as a fallback.",
      isAccessibleForFree: true,
      inLanguage: "en",
      image: absoluteUrl("/social.png"),
      installUrl: absoluteUrl(),
      softwareHelp: absoluteUrl("/about"),
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", url: absoluteUrl() },
      featureList: [
        "Current weather with its provider update time",
        "Today-only hourly temperature and rain forecasts",
        "Local sunrise and sunset themes",
        "Interactive 3D weather illustrations",
        "Real maps and rain radar",
        "City search and optional geolocation",
        "Air quality, UV, wind and humidity",
        "Saved places and offline support",
        "Installable progressive web app",
      ],
    },
  ],
};

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
