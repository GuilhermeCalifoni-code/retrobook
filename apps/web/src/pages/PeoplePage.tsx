import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, ErrorState, SkeletonCard } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { PersonCard } from '@/features/people/PersonCard';
import { useSuggestedPeople } from '@/features/people/use-people';

export function PeoplePage() {
  const { data, isLoading, isError, refetch } = useSuggestedPeople({ limit: 24 });

  return (
    <PageShell width="wide">
      <Seo title="Pessoas" description="Leitores com gosto parecido com o seu." noIndex />

      <PageHeader
        eyebrow="Conexoes"
        title="Leitores compativeis com voce"
        description="A ordem vem de livros, autores, generos e comunidades em comum — e cada card mostra o porque."
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Ainda nao conseguimos sugerir ninguem."
          description="Adicione livros a sua estante e escolha seus generos favoritos. E a partir dai que encontramos pessoas parecidas com voce."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/livros">
                <Button>Adicionar livros</Button>
              </Link>
              <Link to="/comunidades">
                <Button variant="outline">Entrar em comunidades</Button>
              </Link>
            </div>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.items.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </PageShell>
  );
}
