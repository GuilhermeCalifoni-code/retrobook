# RetroBook

**Leia. Encontre. Compartilhe.**

RetroBook é uma rede social de comunidades literárias. A premissa é simples e atravessa todo o produto:

> O livro não é um objeto isolado. É a aresta que conecta pessoas.

Toda tela responde a mesma pergunta — *quem mais está lendo isto, e o que essa pessoa tem a dizer?*

---

## Como rodar

**No Windows, dê duplo clique em `RetroBook.cmd`.** Em qualquer sistema:

```bash
npm start
```

Só isso. O único pré-requisito é o **Node 20+** — nem banco de dados você precisa ter instalado.

O inicializador faz o caminho inteiro sozinho: instala o que falta, encontra ou levanta um PostgreSQL, cria o schema, popula os dados de demonstração, sobe API e Web e abre o navegador. `Ctrl+C` encerra tudo junto.

Para o banco, ele tenta nesta ordem:

1. Um **PostgreSQL já rodando** na porta da sua `DATABASE_URL`
2. O **container do Docker** (`docker-compose.yml`)
3. O **PostgreSQL embutido** — o próprio PostgreSQL compilado para WebAssembly ([PGlite](https://pglite.dev)), rodando dentro do Node e falando o protocolo de rede do Postgres, então o Prisma não vê diferença. Os dados ficam em `apps/api/.pgdata`.

O terceiro caminho é o que faz o duplo clique funcionar numa máquina sem nada instalado. Não substitui um PostgreSQL de verdade em produção — é um atalho para ver o produto rodando.

- Web: http://localhost:5173
- API: http://localhost:4000/api

Se preferir o controle manual, `npm run setup` seguido de `npm run dev` continua funcionando (esse caminho depende do Docker).

### Conta de demonstração

```
e-mail: guilherme@retrobook.app
senha:  retrobook123
```

Todas as contas semeadas usam a mesma senha. A tela de login tem um atalho que preenche os campos.

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm start` | Prepara tudo e abre o app (o mesmo que `RetroBook.cmd`) |
| `npm run dev` | Sobe API e Web juntos, sem preparar o banco |
| `npm run db:up` / `db:down` | Liga/desliga o PostgreSQL |
| `npm run db:push` | Aplica o schema Prisma no banco |
| `npm run db:seed` | Repopula os dados de demonstração (**apaga a base antes**) |
| `npm run db:migrate --workspace @retrobook/api` | Aplica as migrations (o caminho de produção) |
| `npm run db:seed:prod --workspace @retrobook/api` | Semeia só o catálogo, sem apagar nada |
| `npm run build` | Build de produção dos dois apps |
| `npm run typecheck` | Verificação de tipos ponta a ponta |
| `npm run smoke --workspace @retrobook/api` | Percorre a jornada completa contra a API rodando |
| `npx tsx scripts/smoke-evolution.ts` | Testa recomendações, spoilers, universo e métricas |
| `npx tsx scripts/smoke-communities.ts` | Testa pulso, feed, membros e os 5 papéis de permissão |
| `npm run smoke:prod --workspace @retrobook/api` | Jornada de produção a partir de uma base vazia |

São quatro testes de fumaça manuais, rodados contra a API no ar. O `smoke` percorre a jornada principal (57 verificações); o `smoke-evolution` cobre o que a evolução trouxe — motor de recomendação, sinais da Home, Seu Universo, presença por livro, compatibilidade 2.0, spoilers por capítulo, atualização de leitura e métricas (30 verificações); o `smoke-communities` cobre o pulso, filtros, busca de membros e as permissões dos cinco papéis — visitante, membro, moderador, admin e dono, incluindo tentativas de escalada de privilégio (40 verificações). Cada um checa **comportamento**, não status HTTP.

O quarto, `smoke:prod`, é diferente dos outros três: ele não depende do seed de demonstração. Parte de uma base que só tem catálogo e percorre o caminho de quem chega primeiro — cadastro, onboarding, estante, comunidade, limite do plano, discussão, permissões, spoiler com escopo, sessão e erros (52 verificações). Por isso é o único que pode ser apontado para a URL pública:

```bash
RETROBOOK_API=https://sua-api.exemplo.com/api npm run smoke:prod --workspace @retrobook/api
```

> **Se o Docker não subir:** não faz diferença para o `npm start` — ele detecta em poucos segundos e usa o PostgreSQL embutido. Só o `npm run setup` depende do Docker Desktop estar completamente iniciado.

---

## Arquitetura

```
retrobook/
├── RetroBook.cmd                Duplo clique no Windows
├── scripts/launch.mjs           Inicializador: banco, API, web e navegador
├── apps/
│   ├── api/                     Node + TypeScript + Express + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma    Modelo relacional completo
│   │   │   ├── seed.ts          Semeadura
│   │   │   └── seed.data.ts     Dados de demonstração (fictícios)
│   │   ├── scripts/
│   │   │   ├── dev-db.mjs       PostgreSQL embutido (PGlite)
│   │   │   ├── db-status.mjs    Diz se o banco precisa ser preparado
│   │   │   └── smoke.ts         Teste de fumaça da jornada completa
│   │   └── src/
│   │       ├── config/          Validação de env com zod
│   │       ├── common/          Erros, paginação por cursor, sanitização
│   │       ├── database/        Cliente Prisma
│   │       ├── middlewares/     Auth, validação, rate limit, erros
│   │       ├── modules/         Um módulo por domínio
│   │       │   ├── auth/        controller · service · dto · routes
│   │       │   ├── users/ books/ library/ communities/ posts/
│   │       │   ├── discovery/ notifications/ messages/ onboarding/
│   │       │   └── stats/ achievements/ subscriptions/ reports/ settings/
│   │       ├── services/        Provedor de livros (trocável)
│   │       └── shared/          Selectors Prisma e compatibilidade literária
│   └── web/                     React 19 + TypeScript + Vite + Tailwind
│       └── src/
│           ├── design-system/   Componentes base do produto
│           ├── components/      Navegação, busca, marca, SEO
│           ├── features/        Um diretório por domínio (hooks + UI)
│           ├── layouts/         AppLayout, AuthLayout, PageShell
│           ├── pages/           Uma tela por arquivo
│           ├── lib/             Cliente HTTP, formatação, chaves de cache
│           └── types/           Contratos da API
└── docker-compose.yml
```

**Stack:** React 19, TypeScript, Vite, Tailwind, TanStack Query, React Router · Node, Express, Prisma, PostgreSQL, JWT com refresh rotativo.

---

## Decisões de produto que viraram código

### Design system com tokens semânticos, não valores soltos

Raio, tipografia, sombra e cor vivem em `tailwind.config.js` nomeados **por papel**: `rounded-control` (inputs), `rounded-panel` (blocos internos), `rounded-card` (superfícies), `rounded-sheet` (modais). Tipografia idem — `text-display`, `text-heading`, `text-body`, `text-caption`, `text-label`.

O frontend tem **zero valores arbitrários**: nenhum `text-[0.98rem]`, nenhum `#F7F1E5`, nenhuma sombra inline. Um componente que precise de um valor novo precisa primeiro nomeá-lo no sistema.

Dois tokens existem por razão de acessibilidade: `on-brand` e `on-gold` são tintas **fixas** (não invertem no dark mode) porque cor de marca é sempre escura ou sempre clara; e `action` é o fundo de botão primário, separado do burgundy de texto — o burgundy que funciona como link é claro demais para receber tinta clara no tema escuro.

### Uma comunidade viva não é uma comunidade grande

O **Community Pulse** (`community-pulse.service.ts`) ignora o número de membros. Olha para movimento recente e para o sinal que importa: a proporção de discussões que **recebem resposta**. Uma comunidade de 500 membros parada há um mês pulsa menos que uma de 40 com conversa toda semana.

O resultado nunca vira score na tela — vira frase: *"Ativa hoje"*, *"Última conversa há 3 semanas"*, *"Começando agora"*.

A mesma lógica governa o ranking de conversas: o "calor" combina respostas, pessoas distintas e recência. Curtida entra com peso baixo de propósito — ela mede aprovação, não conversa, e o RetroBook otimiza para conversa.

### Toda recomendação carrega a razão

`apps/api/src/modules/recommendations/` centraliza o que antes vivia espalhado em três módulos. O contrato é o ponto: **nenhuma recomendação sai sem `reasons`**. Se o motor não sabe explicar por que sugeriu algo, a sugestão não deveria existir.

Livros, pessoas, comunidades e discussões saem do mesmo motor, com uma única leitura do perfil de gosto — o que evita repetir as consultas caras quatro vezes para montar uma Home. Sem sinal nenhum, ele devolve resultados populares **rotulados como populares**, em vez de fingir personalização.

### A Home responde "o que mudou desde que eu vim?"

Não é uma vitrine de cards. `home.service.ts` calcula *sinais*: frases curtas com prioridade e destino — "Mais 3 pessoas estão lendo Duna", "2 novas respostas apareceram em uma discussão sua", "Você e Ana têm 86% de compatibilidade". A interface ordena e mostra os melhores.

### Spoiler com alcance estruturado libera sozinho

Evolução do texto livre para `spoilerScopeType` + `spoilerScopeValue`. "Spoiler até o capítulo 12" some sozinho quando você chega ao capítulo 13 — a comparação entre o alcance e o seu progresso roda no backend, então o app nativo futuro recebe a decisão pronta.

### Descoberta serendípita

`recommendSerendipity` procura de propósito **fora** dos gêneros declarados: livros nota 5 de leitores com alta afinidade, em território que a pessoa não pediria. Não é aleatoriedade — o caminho até ali passa por gente com gosto parecido.

### Compatibilidade literária é explicável, não mágica

`apps/api/src/shared/compatibility.ts` calcula um score de 0 a 100 a partir de pesos declarados — livros (9), autores (6), comunidades (5), gêneros (4), concordância de nota (3) — com saturação exponencial, para que a 12ª coincidência valha menos que a 2ª.

O algoritmo devolve **as razões junto com o número**. A interface nunca mostra "92%" sozinho: mostra "7 livros em comum · 3 gêneros em comum" — e, mais importante, os `conversationStarters`: os assuntos concretos onde as duas estantes se encostam, com prioridade para o que ambos avaliaram bem. O número vira conversa.

### O livro puxa a conversa

Um `Post` sem comunidade e com livro é uma discussão aberta do livro. Ao publicá-la, quem está lendo aquele livro é notificado. É o caminho mais curto entre "estou lendo X" e "estou conversando com alguém sobre X".

### Spoiler tem alcance declarado

Não basta marcar "contém spoiler": o autor informa *até onde* ("até o capítulo 12"). A preferência `HIDE_UNREAD` usa a biblioteca de quem lê para decidir — se você já terminou o livro, o spoiler aparece normalmente.

### O limite de 3 membros do plano gratuito é a estratégia

Comunidades pequenas nascem de graça; comunidades que crescem viram assinatura. Toda checagem passa por `plans.service.ts` e o limite aparece na interface de forma honesta (o dono vê o aviso e o caminho), nunca como erro genérico.

### Provedor de livros é trocável

`services/book-provider/` define uma interface. `local` (acervo semeado, funciona offline e sem chave) e `google` (Google Books) implementam. Trocar de provedor é mudar `BOOK_PROVIDER` no `.env` — nenhum controller conhece a origem dos metadados.

### Capas geradas em vez de retângulos cinza

Livros sem imagem recebem uma capa tipográfica determinística, derivada do título: mesma capa em qualquer tela, sempre. Com `BOOK_PROVIDER=google`, as capas reais dos livros buscados passam a vir do provedor.

### Mobile não é o desktop reduzido

O modo estrutural vem de `useLayoutMode()`. No mobile a sidebar vira navegação inferior com botão central de publicação; mensagens viram duas telas em vez de dois painéis; a busca do topo vira um atalho.

### Mobile Preview

Em telas grandes, o seletor no topo (ou em *Configurações › Aparência*) troca entre **Automático, Tablet e Mobile**. O app aparece dentro de um mockup de aparelho e **muda de estrutura**, não de escala.

A implementação importa aqui: o preview roda o app num `iframe` com a largura real do aparelho (390 ou 834px), em vez de tentar enganar as media queries. Assim `sm:`/`lg:` e tudo mais se comportam exatamente como num celular — a primeira versão escalava o container e os grids continuavam respondendo à janela de 1280px, o que espremia os cards. Como o iframe é de mesma origem, a sessão continua valendo, e o aparelho encolhe proporcionalmente quando a janela é pequena.

---

## Deploy

O site está no ar em **https://retrobook-alpha.vercel.app**. A API e o banco ainda não foram provisionados — até lá o site carrega e navega, mas cadastro e login falham.

O RetroBook é um monorepo com duas metades que vão para lugares diferentes:

```text
navegador -> Vercel (site estático) -> Render (API, processo longo) -> PostgreSQL
```

A API **não** vai para função serverless. Ela mantém pool de conexões do Prisma e rate limit em memória: em serverless, cada invocação fria abriria um pool novo e o rate limit contaria por instância, virando decoração. O site, ao contrário, é estático — exatamente o que uma CDN faz melhor.

O site chama `/api` na mesma origem, encaminhado por rewrite. Não é detalhe de conveniência: a sessão vive em cookie `httpOnly`, e cookie same-origin dispensa `SameSite=None` — que exige HTTPS e quebra em navegadores que bloqueiam cookie de terceiros. `VITE_API_URL` existe para quando a API tiver domínio próprio.

Produção usa `prisma migrate deploy`, nunca `db push`. O seed de produção é um script separado que nunca apaga nada e não cria uma única pessoa falsa.

**O passo a passo completo — variáveis, migrations, rollback, backup e diagnóstico — está em [docs/deployment.md](docs/deployment.md).**

---

## Segurança

- Senhas com bcrypt (12 rounds); comparação executada mesmo quando o e-mail não existe, para não vazar contas pelo tempo de resposta.
- Access token (15 min) + refresh token rotativo (30 dias) em cookies `httpOnly`; apenas o hash do refresh vai para o banco.
- Trocar a senha revoga todas as sessões abertas.
- Recuperação de senha responde igual exista ou não a conta.
- Todo input passa por schema zod; conteúdo é armazenado como texto puro (sem HTML) e renderizado como texto — dupla barreira contra XSS.
- Prisma parametriza as queries (sem SQL injection).
- Rate limit em três níveis: geral, credenciais e escrita de conteúdo.
- Autorização por papel de comunidade (`OWNER > ADMIN > MODERATOR > MEMBER`), com a regra de que só se modera quem está estritamente abaixo.
- Comunidades privadas não vazam posts em feed, busca ou descoberta.

## Acessibilidade

Foco visível consistente, `aria-live` nos toasts, trap de foco e `Escape` nos diálogos, `aria-pressed`/`aria-checked` nos controles, alvos de toque de 44px no mobile, contraste ajustado (o dourado foi escurecido em relação ao `#C89B3C` original para passar em AA sobre creme) e `prefers-reduced-motion` respeitado.

## Performance

Paginação por cursor em todas as listas, code-splitting por rota, debounce nas buscas, contadores desnormalizados para evitar `COUNT` em feed, perfis de gosto carregados em consultas agregadas (não N+1) e imagens com `loading="lazy"`.

---

## Estado da implementação

**Pronto e funcional:** autenticação completa (cadastro, login, recuperação, verificação, troca de senha, sessões), onboarding em 5 etapas, home, feed, explorar, catálogo e página de livro, biblioteca pessoal com progresso, comunidades (descoberta, wizard de criação em 9 etapas, página com abas, regras, moderação, papéis, aprovação de entrada), discussões com comentários aninhados e spoilers, perfis com compatibilidade, seguir, notificações, mensagens diretas, resenhas, conquistas, estatísticas, configurações completas, dark mode, Mobile Preview, estados de loading/vazio/erro/offline.

**Deliberadamente fora do MVP:**

- **Login social** — o endpoint `/auth/social` e o modelo `SocialAccount` existem; falta plugar o SDK do provedor. O botão está desativado e diz isso.
- **Envio de e-mail** — não há serviço configurado. Em desenvolvimento, os tokens de verificação e recuperação voltam na própria resposta da API para o fluxo ser testável ponta a ponta.
- **Upload de imagem** — avatar e capa aceitam URL. O armazenamento S3-compatible entra junto com o upload.
- **Cobrança** — planos, limites e assinaturas estão modelados e aplicados; falta apenas o gateway. Os preços exibidos são referência do modelo de negócio.

Nada disso aparece como botão que não faz nada: onde a funcionalidade ainda não existe, a interface diz o que está acontecendo.

---

## Dados de demonstração

28 livros conhecidos usados apenas como catálogo de exemplo. **Pessoas, comunidades, discussões e resenhas são inteiramente fictícias** — nenhum dado pessoal real foi utilizado.

`npm run db:seed` recria tudo do zero.

---

## North Star

O RetroBook não persegue tempo de tela. A métrica principal é **conversas literárias significativas**: uma discussão que recebeu resposta de outra pessoa — ou seja, o momento em que o produto cumpriu a promessa de conectar dois leitores em torno de um livro.

O evento é gravado uma única vez por discussão (`events.service.ts`), junto com o funil de ativação (conta → onboarding → primeiro livro → primeira comunidade). `GET /api/discovery/metrics` devolve o painel, restrito a administradores — é a base do painel administrativo futuro.
