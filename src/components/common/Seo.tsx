import { Helmet } from "react-helmet-async";
import { siteConfig } from "../../constants/site";

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function Seo({ title, description, path = "/", image, structuredData }: SeoProps) {
  const canonical = `${siteConfig.baseUrl}${path}`;
  const pageTitle = `${title} | ${siteConfig.name}`;
  const graphImage = image ?? `${siteConfig.baseUrl}/favicon.png`;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={graphImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={graphImage} />
      {structuredData ? (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(structuredData)
              ? structuredData
              : [
                  {
                    "@context": "https://schema.org",
                    ...structuredData
                  }
                ]
          )}
        </script>
      ) : null}
    </Helmet>
  );
}
