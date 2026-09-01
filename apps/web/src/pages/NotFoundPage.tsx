import { Link } from 'react-router-dom';
import { Button } from '@/design-system';
import { LogoMark } from '@/components/brand/Logo';
import { Seo } from '@/components/seo/Seo';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center rb-paper">
      <Seo title="Pagina nao encontrada" noIndex />

      <LogoMark className="h-12 w-12" />
      <p className="mt-6 font-mono text-sm text-subtle">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink text-balance">
        Essa pagina saiu do catalogo.
      </h1>
      <p className="mt-3 max-w-md text-muted text-pretty">
        O endereco que voce abriu nao existe ou foi movido. Volte para a estante e continue de onde parou.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/inicio">
          <Button>Ir para o inicio</Button>
        </Link>
        <Link to="/explorar">
          <Button variant="outline">Explorar</Button>
        </Link>
      </div>
    </div>
  );
}
