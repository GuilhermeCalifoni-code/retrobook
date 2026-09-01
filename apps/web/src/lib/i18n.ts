/**
 * Camada de internacionalizacao (secao 51).
 *
 * O objetivo aqui **nao** e traduzir o produto agora — e garantir que traduzir
 * depois nao exija uma refatoracao gigante. Por isso comecamos pelo que mais
 * se repete e mais custa manter espalhado: os textos compartilhados de estado,
 * acao e feedback, que hoje apareciam escritos de formas ligeiramente
 * diferentes em cada tela.
 *
 * Textos de tela unica seguem inline por enquanto — abstrair todos de uma vez
 * traria custo sem beneficio (secao 49). Quando o segundo idioma entrar, o
 * caminho ja esta aberto: basta adicionar o dicionario e trocar a resolucao de
 * `locale`.
 */

export const LOCALES = ['pt-BR', 'en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pt-BR';

/**
 * Vocabulario oficial do produto (secao 43).
 *
 * Estes termos foram escolhidos e nao devem variar: "comunidade" nunca vira
 * "grupo", "clube" ou "canal"; "discussao" nunca vira "post" ou "topico".
 */
const ptBR = {
  // -- Termos oficiais ------------------------------------------------------
  'term.community': 'comunidade',
  'term.communities': 'comunidades',
  'term.discussion': 'discussao',
  'term.discussions': 'discussoes',
  'term.reply': 'resposta',
  'term.replies': 'respostas',
  'term.member': 'membro',
  'term.members': 'membros',
  'term.reader': 'leitor',
  'term.readers': 'leitores',
  'term.shelf': 'estante',
  'term.review': 'resenha',

  // -- Acoes ----------------------------------------------------------------
  'action.retry': 'Tentar novamente',
  'action.cancel': 'Cancelar',
  'action.save': 'Salvar',
  'action.publish': 'Publicar',
  'action.loadMore': 'Carregar mais',
  'action.seeAll': 'Ver todas',
  'action.follow': 'Seguir',
  'action.following': 'Seguindo',
  'action.join': 'Entrar na comunidade',
  'action.requestJoin': 'Pedir para entrar',
  'action.participating': 'Participando',
  'action.newDiscussion': 'Nova discussao',
  'action.findBooks': 'Encontrar livros',
  'action.exploreCommunities': 'Explorar comunidades',

  // -- Estados --------------------------------------------------------------
  'state.loading': 'Carregando...',
  'state.error.title': 'Algo nao saiu como esperado.',
  'state.error.description': 'Pode ter sido uma instabilidade momentanea. Tente novamente.',
  'state.error.network': 'Nao conseguimos falar com o servidor. Verifique sua conexao e tente de novo.',
  'state.offline': 'Voce esta sem conexao. Algumas alteracoes serao sincronizadas quando voltar.',
  'state.empty.library.title': 'Sua estante ainda esta vazia.',
  'state.empty.library.description':
    'Comece pelo livro que esta na sua mesa de cabeceira. E dele que saem suas primeiras conexoes.',
  'state.empty.communities.title': 'Toda comunidade comeca com uma primeira conversa.',
  'state.empty.people.title': 'Ainda nao conseguimos sugerir ninguem.',
  'state.empty.notifications.title': 'Nada por aqui ainda.',
  'state.empty.messages.title': 'Nenhuma conversa ainda.',

  // -- Feedback -------------------------------------------------------------
  'toast.saved': 'Alteracoes salvas.',
  'toast.linkCopied': 'Link copiado.',
  'toast.postPublished': 'Sua discussao esta no ar.',
  'toast.commentPublished': 'Comentario publicado.',
} as const;

export type MessageKey = keyof typeof ptBR;

/** Dicionarios adicionais entram aqui quando o segundo idioma chegar. */
const DICTIONARIES: Record<Locale, Partial<Record<MessageKey, string>>> = {
  'pt-BR': ptBR,
  en: {},
  es: {},
};

let activeLocale: Locale = DEFAULT_LOCALE;

export function setLocale(locale: Locale) {
  activeLocale = locale;
  document.documentElement.lang = locale;
}

export function getLocale(): Locale {
  return activeLocale;
}

/**
 * Resolve uma chave no idioma ativo, caindo para pt-BR quando faltar tradução.
 * Aceita interpolacao simples: t('x', { count: 3 }) substitui {count}.
 */
export function t(key: MessageKey, values?: Record<string, string | number>): string {
  const raw = DICTIONARIES[activeLocale]?.[key] ?? ptBR[key] ?? key;
  if (!values) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}

/** Plural simples do portugues; idiomas com mais formas ganham regra propria. */
export function plural(count: number, one: MessageKey, many: MessageKey): string {
  return `${count} ${t(count === 1 ? one : many)}`;
}
