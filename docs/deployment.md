# RetroBook — deploy

Como o RetroBook sai do laptop e vai para a internet, e como voltar atras
quando algo der errado.

---

## 1. A forma do sistema

```text
                 navegador
                     |
                     v
        +------------------------+
        |  Vercel (site estatico)|   apps/web -> dist
        |  rewrite /api/* ------------------+
        +------------------------+          |
                                            v
                              +---------------------------+
                              |  Render (processo longo)  |  apps/api
                              +---------------------------+
                                            |
                                            v
                              +---------------------------+
                              |    PostgreSQL gerenciado  |
                              +---------------------------+
```

### Por que a API nao vai para a Vercel junto com o site

Nao e preferencia. A API mantem um pool de conexoes do Prisma e um rate
limit em memoria. Em funcao serverless, cada invocacao fria abre um pool
novo — o Postgres esgota conexoes muito antes de o trafego justificar — e
o rate limit passa a contar por instancia, virando decoracao. Um servico de
processo longo resolve os dois de graca.

O site, ao contrario, e HTML e JS estatico: e exatamente o que uma CDN faz
melhor.

### Por que o site chama `/api` e nao a URL da API direto

As duas formas funcionam, e o codigo suporta as duas. A diferenca esta no
cookie de sessao.

- **Mesma origem** (padrao): o rewrite da Vercel encaminha `/api/*` para a
  API. O navegador ve tudo vindo do dominio do site, o cookie fica
  `SameSite=Lax` e sobrevive a bloqueio de cookie de terceiros.
- **Dominio proprio**: preenchendo `VITE_API_URL`, o site chama a API
  direto. Ai o cookie precisa de `SameSite=None; Secure`, o que exige HTTPS
  e deixa a sessao vulneravel a navegadores que bloqueiam cookie
  cross-site — Safari e Brave, por padrao, quebram esse login.

Prefira a primeira. A segunda existe para quando a API tiver dominio proprio
e voce controlar os dois.

---

## 2. Codigo

Repositorio: `guilhermecalifoni-IAops/retrobook` (privado).

```text
retrobook/
  apps/api      Express + Prisma + PostgreSQL
  apps/web      React + Vite + Tailwind
  scripts/      launcher de desenvolvimento
  vercel.json   build e rewrites do site
  render.yaml   blueprint da API + banco
```

npm workspaces. `npm install` na raiz instala os dois.

---

## 3. Banco de producao

Qualquer PostgreSQL 14+ gerenciado serve. O `render.yaml` provisiona um
junto com a API; Neon e Supabase tambem funcionam — o Prisma nao distingue.

O que importa na escolha:

- PostgreSQL de verdade (nao um dialeto compativel);
- SSL na connection string (`?sslmode=require` na maioria dos provedores);
- se houver pooler (PgBouncer), acrescente `?pgbouncer=true`, senao o
  Prisma quebra com `prepared statement "s0" already exists`.

**A `DATABASE_URL` nunca entra no repositorio.** Ela vive apenas no painel
do provedor.

### Migrations

Producao usa `prisma migrate deploy`, nunca `db push`. O `db push` altera o
schema sem deixar historico e sem forma de reverter.

O `startCommand` da API roda `migrate deploy` antes de subir o processo.
E idempotente: se nao ha migration nova, nao faz nada.

```bash
npm run db:migrate --workspace @retrobook/api
```

A migration inicial cobre 38 tabelas, 17 enums, 69 indices e 62 chaves
estrangeiras. Ela foi verificada aplicando-a a um banco vazio e comparando
o resultado com o schema: o diff volta vazio.

### Seed

Sao dois, e a diferenca importa.

| | `db:seed` | `db:seed:prod` |
|---|---|---|
| Apaga a base antes | **sim** | nunca |
| Idempotente | nao | sim |
| Cria usuarios/comunidades/posts | sim | **nunca** |
| Cria catalogo (planos, generos, livros) | sim | sim |

Rodar `db:seed` contra producao destruiria todas as contas reais. O script
de producao nao tem um unico `delete`.

```bash
npm run db:seed:prod --workspace @retrobook/api
```

---

## 4. Variaveis de ambiente

Apenas nomes. Os valores vivem no painel de cada plataforma.

### API

| Nome | Obrigatoria | Observacao |
|---|---|---|
| `DATABASE_URL` | sim | do provedor de Postgres, com SSL |
| `JWT_ACCESS_SECRET` | sim | 32+ chars, unico |
| `JWT_REFRESH_SECRET` | sim | 32+ chars, **diferente** do de acesso |
| `WEB_ORIGIN` | sim | URL publica do site, separada por virgula se mais de uma |
| `COOKIE_SAMESITE` | nao | `lax` (padrao) ou `none` se a API tiver dominio proprio |
| `VERCEL_PREVIEW_PATTERN` | nao | regex ancorado para liberar os previews no CORS |
| `NODE_ENV` | sim | `production` |
| `PORT` | nao | a plataforma normalmente injeta |
| `BOOK_PROVIDER` | nao | `local` (padrao) ou `google` |
| `GOOGLE_BOOKS_API_KEY` | nao | so se `BOOK_PROVIDER=google` |

Gere os segredos assim:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

A API **se recusa a iniciar** em producao se os segredos forem os do
`.env.example`, tiverem menos de 32 caracteres ou forem iguais entre si.
Falhar no boot e melhor do que assinar tokens que qualquer pessoa com
acesso ao repositorio consegue forjar.

### Site

| Nome | Obrigatoria | Observacao |
|---|---|---|
| `VITE_API_URL` | nao | vazio = mesma origem (recomendado) |
| `VITE_PUBLIC_URL` | nao | URL canonica, usada no SEO |

Variaveis `VITE_*` sao embutidas no bundle em tempo de build e ficam
visiveis para qualquer visitante. **Nunca coloque segredo em variavel
`VITE_*`.**

---

## 5. Publicar o site (Vercel)

1. Em vercel.com, **Add New > Project** e importe o repositorio.
2. **Root Directory: deixe na raiz** (`./`), nao em `apps/web`. O
   `vercel.json` ja aponta o build para o workspace certo, e a instalacao
   precisa acontecer na raiz para o npm workspaces resolver as dependencias.
3. As configuracoes de build vem do `vercel.json`; nao e preciso preencher
   nada a mao.
4. Deploy.

Depois do primeiro deploy voce tem a URL publica. Guarde-a: ela e o valor
de `WEB_ORIGIN` na API.

### Ligando o site a API

Depois que a API estiver no ar, acrescente ao `vercel.json`, **antes** do
rewrite de SPA:

```json
{ "source": "/api/:path*", "destination": "https://SUA-API.onrender.com/api/:path*" }
```

A ordem importa: o rewrite de SPA e o curinga final e engoliria `/api`.
Ele ja exclui `/api/` no padrao (`/((?!api/).*)`), mas o rewrite especifico
precisa vir antes para ser avaliado primeiro.

Commit, push, e a Vercel republica sozinha.

---

## 6. Publicar a API (Render)

1. Em render.com, **New > Blueprint** e aponte para o repositorio. O
   `render.yaml` cria o servico e o banco juntos.
2. `DATABASE_URL` e ligada automaticamente ao banco criado.
3. `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` sao geradas pela plataforma.
4. Preencha `WEB_ORIGIN` com a URL da Vercel — e a unica variavel manual.
5. Se voce optar por chamar a API direto (sem rewrite), troque
   `COOKIE_SAMESITE` para `none`.

Health check: `/api/health`.

Depois do primeiro deploy, popule o catalogo uma vez:

```bash
npm run db:seed:prod --workspace @retrobook/api
```

---

## 7. Deploy automatico

Vercel e Render observam o repositorio. Depois de conectados:

```text
git push  ->  build  ->  deploy
```

Branches e pull requests geram preview na Vercel sem tocar em producao.
Para que o login funcione nos previews, preencha `VERCEL_PREVIEW_PATTERN`
na API com algo ancorado, por exemplo:

```text
^https://retrobook-[a-z0-9-]+\.vercel\.app$
```

---

## 8. Verificar que o deploy funcionou de verdade

"Deployment successful" nao quer dizer que o produto funciona. Rode o smoke
de producao contra a URL real:

```bash
RETROBOOK_API=https://SUA-API.onrender.com/api npm run smoke:prod --workspace @retrobook/api
```

Sao 52 verificacoes que partem de uma base vazia e percorrem cadastro,
onboarding, estante, comunidade, limite do plano gratuito, discussao,
permissoes por papel, spoiler com escopo, refresh de sessao e tratamento de
erro. As contas criadas usam o dominio reservado `retrobook.test` e um
sufixo aleatorio; nada e apagado.

---

## 9. Rollback

### Site (Vercel)

Cada deploy fica guardado. Em **Deployments**, abra um anterior e use
**Promote to Production**. Leva segundos e nao exige `git revert`.

### API (Render)

Em **Events**, use **Rollback** para a versao anterior.

### Banco

**Rollback de codigo nao desfaz migration.** Uma migration que remove
coluna e destrutiva: voltar o codigo nao traz o dado de volta.

Antes de qualquer migration destrutiva, tire um backup manual. Para
reverter, escreva uma migration nova que desfaca a mudanca — nunca edite
uma migration ja aplicada, porque `migrate deploy` a considera concluida e
nao vai reexecuta-la.

---

## 10. Backup

Verifique no painel do provedor o que o seu plano oferece. Planos gratuitos
de Postgres normalmente **nao tem backup automatico** e muitos expiram ou
suspendem o banco apos um periodo de inatividade.

Se for o caso, o backup e manual e e sua responsabilidade:

```bash
pg_dump "$DATABASE_URL" > retrobook-$(date +%Y%m%d).sql
```

Nao assuma que existe backup so porque o banco e gerenciado.

---

## 11. Quando algo quebra

**O site abre mas tudo fica carregando / 401 em tudo**
A sessao nao esta chegando. Veja se o cookie aparece em DevTools >
Application > Cookies. Se o site e a API estao em dominios diferentes e
`COOKIE_SAMESITE` continua `lax`, o navegador esta descartando o cookie —
esse e o caso mais comum, e nao gera erro visivel no console.

**CORS bloqueando**
`WEB_ORIGIN` precisa bater exatamente com a origem do site: protocolo,
dominio, sem barra no fim. Preview deployments precisam de
`VERCEL_PREVIEW_PATTERN`.

**Link direto da 404, mas navegar pelo app funciona**
O fallback de SPA nao esta ativo. Confira o bloco `rewrites` do
`vercel.json`.

**A API nao sobe e o log fala de segredo**
E a validacao de boot funcionando. Gere segredos de 32+ caracteres,
diferentes entre si.

**`prepared statement "s0" already exists`**
Ha um pooler entre a API e o banco. Acrescente `?pgbouncer=true` a
`DATABASE_URL`.

**Primeira requisicao do dia demora muito**
Servicos gratuitos hibernam apos inatividade. E o plano, nao o codigo.

---

## 12. Custos

O desenho cabe em free tier: site estatico na Vercel, um servico web e um
Postgres pequeno.

Os limites e a politica de cada plano mudam com frequencia — confira no
painel de cada provedor antes de depender deles. Dois pontos que costumam
pegar de surpresa em planos gratuitos de Postgres: expiracao apos um
periodo, e ausencia de backup automatico.

---

## 13. Dependencias

`npm audit --omit=dev` reporta 3 avisos de gravidade alta, todos o mesmo
problema: `deepmerge-ts` < 8.0.0 sofre estouro de pilha ao mesclar grafos de
objeto recursivos (GHSA-ggr8-5vv4-36mx).

O caminho ate ele e unico:

```text
prisma (CLI, devDependency)  ->  @prisma/config  ->  deepmerge-ts
```

`@prisma/client` — o que realmente roda no processo que atende requisicao —
**nao** alcanca esse pacote. Verificado percorrendo a arvore de dependencias,
nao presumido.

Na pratica isso significa que o codigo vulneravel so e carregado pela CLI, ao
ler o proprio arquivo de configuracao do projeto, durante build e
`migrate deploy`. Ele nunca ve dado de usuario. Para explorar a falha seria
preciso controlar a configuracao do Prisma — ou seja, ja ter acesso de
escrita ao repositorio.

A correcao existe apenas em `deepmerge-ts` 8.0.0, e nao ha versao do Prisma
6.x que ja a adote. Forcar o salto major via `overrides` trocaria um risco
teorico, sem superficie de ataque, pelo risco concreto de quebrar a
ferramenta que aplica as migrations. Por isso **nao foi forcado**.

Revisar quando o Prisma publicar uma versao que adote a 8.x.
