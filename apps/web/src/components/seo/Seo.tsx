/**
 * SEO por pagina (secao 49).
 * O React 19 iça <title> e <meta> declarados em qualquer componente para o
 * <head>, entao nao precisamos de biblioteca extra.
 */
export interface SeoProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
}

export function Seo({ title, description, canonical, image, type = 'website', noIndex }: SeoProps) {
  const fullTitle = title.includes('RetroBook') ? title : `${title} — RetroBook`;
  const url = canonical ?? (typeof window !== 'undefined' ? window.location.href : undefined);

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {url && <link rel="canonical" href={url} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
    </>
  );
}
