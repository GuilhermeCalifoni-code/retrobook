/**
 * Dados de demonstracao do RetroBook.
 *
 * Os livros sao obras conhecidas usadas apenas como catalogo de exemplo.
 * As pessoas, comunidades, discussoes e resenhas sao inteiramente ficticias —
 * nenhum dado pessoal real e utilizado.
 *
 * As capas ficam propositalmente vazias: o app gera uma capa tipografica para
 * cada livro. Ao configurar BOOK_PROVIDER=google, as capas reais passam a vir
 * do provedor externo.
 */

export const GENRES = [
  { slug: 'fantasia', name: 'Fantasia', description: 'Mundos inventados, magia e mitologia.' },
  { slug: 'ficcao-cientifica', name: 'Ficcao cientifica', description: 'Futuros possiveis e perguntas dificeis.' },
  { slug: 'romance', name: 'Romance', description: 'Historias de afeto e vinculo.' },
  { slug: 'terror', name: 'Terror', description: 'O que assusta e o que fica depois do susto.' },
  { slug: 'suspense', name: 'Suspense', description: 'Tensao que nao deixa fechar o livro.' },
  { slug: 'misterio', name: 'Misterio', description: 'Enigmas, investigacao e revelacao.' },
  { slug: 'historia', name: 'Historia', description: 'O passado contado com rigor.' },
  { slug: 'biografia', name: 'Biografia', description: 'Vidas reais, narradas de perto.' },
  { slug: 'filosofia', name: 'Filosofia', description: 'Perguntas que atravessam seculos.' },
  { slug: 'literatura-brasileira', name: 'Literatura brasileira', description: 'A biblioteca daqui.' },
  { slug: 'literatura-estrangeira', name: 'Literatura estrangeira', description: 'Vozes de outros lugares.' },
  { slug: 'desenvolvimento-pessoal', name: 'Desenvolvimento pessoal', description: 'Habitos, foco e escolhas.' },
  { slug: 'ficcao', name: 'Ficcao', description: 'Narrativas inventadas de todo tipo.' },
  { slug: 'nao-ficcao', name: 'Nao ficcao', description: 'Realidade em forma de livro.' },
  { slug: 'poesia', name: 'Poesia', description: 'A palavra no seu estado mais denso.' },
  { slug: 'classicos', name: 'Classicos', description: 'Livros que sobreviveram ao tempo.' },
  { slug: 'hqs', name: 'HQs', description: 'Narrativa em quadrinhos.' },
  { slug: 'mangas', name: 'Mangas', description: 'Quadrinhos japoneses.' },
  { slug: 'distopia', name: 'Distopia', description: 'Sociedades que deram errado.' },
  { slug: 'ensaio', name: 'Ensaio', description: 'Pensamento em primeira pessoa.' },
];

export interface SeedBook {
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  year: number;
  pages: number;
  genres: string[];
  description: string;
}

export const BOOKS: SeedBook[] = [
  {
    slug: 'duna',
    title: 'Duna',
    author: 'Frank Herbert',
    year: 1965,
    pages: 412,
    genres: ['ficcao-cientifica', 'classicos'],
    description:
      'Em Arrakis, o planeta deserto onde a especia mais valiosa do universo e extraida, a familia Atreides recebe um presente que e tambem uma armadilha. Politica, ecologia e profecia se cruzam em uma das obras mais influentes da ficcao cientifica.',
  },
  {
    slug: 'o-nome-do-vento',
    title: 'O Nome do Vento',
    author: 'Patrick Rothfuss',
    year: 2007,
    pages: 656,
    genres: ['fantasia'],
    description:
      'Kvothe conta a propria historia: a infancia entre artistas viajantes, a perda, a fome nas ruas e a entrada na Universidade onde a magia se estuda como ciencia.',
  },
  {
    slug: '1984',
    title: '1984',
    author: 'George Orwell',
    year: 1949,
    pages: 416,
    genres: ['distopia', 'classicos', 'ficcao'],
    description:
      'Winston Smith reescreve o passado para viver num presente vigiado. Um romance sobre linguagem, poder e a possibilidade de pensar em liberdade.',
  },
  {
    slug: 'a-revolucao-dos-bichos',
    title: 'A Revolucao dos Bichos',
    author: 'George Orwell',
    year: 1945,
    pages: 152,
    genres: ['classicos', 'ficcao', 'distopia'],
    description: 'Uma fabula curta e afiada sobre como uma revolucao aprende a trair a si mesma.',
  },
  {
    slug: 'cem-anos-de-solidao',
    title: 'Cem Anos de Solidao',
    author: 'Gabriel Garcia Marquez',
    year: 1967,
    pages: 448,
    genres: ['literatura-estrangeira', 'classicos', 'ficcao'],
    description:
      'A saga dos Buendia em Macondo, onde o extraordinario acontece com a naturalidade do cotidiano e o tempo anda em circulos.',
  },
  {
    slug: 'grande-sertao-veredas',
    title: 'Grande Sertao: Veredas',
    author: 'Joao Guimaraes Rosa',
    year: 1956,
    pages: 624,
    genres: ['literatura-brasileira', 'classicos'],
    description:
      'Riobaldo narra sua travessia pelo sertao, entre jagunços, amor e a duvida que atravessa o livro inteiro: existe o diabo?',
  },
  {
    slug: 'memorias-postumas-de-bras-cubas',
    title: 'Memorias Postumas de Bras Cubas',
    author: 'Machado de Assis',
    year: 1881,
    pages: 208,
    genres: ['literatura-brasileira', 'classicos'],
    description:
      'Um defunto autor escreve a propria vida com ironia impecavel e liberdade formal que ainda soa moderna.',
  },
  {
    slug: 'dom-casmurro',
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    year: 1899,
    pages: 256,
    genres: ['literatura-brasileira', 'classicos'],
    description:
      'Bentinho conta a historia de Capitu. O leitor precisa decidir sozinho o quanto pode confiar em quem narra.',
  },
  {
    slug: 'a-hora-da-estrela',
    title: 'A Hora da Estrela',
    author: 'Clarice Lispector',
    year: 1977,
    pages: 96,
    genres: ['literatura-brasileira', 'ficcao'],
    description:
      'Macabea existe quase sem ocupar espaco, e o narrador se pergunta se tem direito de conta-la. Um livro curto que nao cabe em resumo.',
  },
  {
    slug: 'o-conto-da-aia',
    title: 'O Conto da Aia',
    author: 'Margaret Atwood',
    year: 1985,
    pages: 368,
    genres: ['distopia', 'ficcao', 'literatura-estrangeira'],
    description: 'Em Gilead, corpos femininos viraram recurso do Estado. Offred narra o que ainda consegue guardar.',
  },
  {
    slug: 'neuromancer',
    title: 'Neuromancer',
    author: 'William Gibson',
    year: 1984,
    pages: 320,
    genres: ['ficcao-cientifica'],
    description: 'O romance que deu forma ao cyberpunk: consoles, implantes, corporacoes e um hacker sem saida.',
  },
  {
    slug: 'a-mao-esquerda-da-escuridao',
    title: 'A Mao Esquerda da Escuridao',
    author: 'Ursula K. Le Guin',
    year: 1969,
    pages: 304,
    genres: ['ficcao-cientifica', 'classicos'],
    description:
      'Um enviado humano tenta compreender um planeta onde genero nao e uma categoria fixa. Antropologia em forma de romance.',
  },
  {
    slug: 'os-despossuidos',
    title: 'Os Despossuidos',
    author: 'Ursula K. Le Guin',
    year: 1974,
    pages: 400,
    genres: ['ficcao-cientifica', 'filosofia'],
    description: 'Dois mundos vizinhos, dois projetos politicos, e um fisico que atravessa a fronteira entre eles.',
  },
  {
    slug: 'a-menina-que-roubava-livros',
    title: 'A Menina que Roubava Livros',
    author: 'Markus Zusak',
    year: 2005,
    pages: 480,
    genres: ['ficcao', 'historia', 'literatura-estrangeira'],
    description: 'A Morte narra a historia de Liesel, que aprende a ler enquanto a Alemanha desmorona ao redor.',
  },
  {
    slug: 'o-morro-dos-ventos-uivantes',
    title: 'O Morro dos Ventos Uivantes',
    author: 'Emily Bronte',
    year: 1847,
    pages: 416,
    genres: ['classicos', 'romance', 'literatura-estrangeira'],
    description: 'Nao e uma historia de amor: e uma historia sobre o que a obsessao faz com duas familias inteiras.',
  },
  {
    slug: 'orgulho-e-preconceito',
    title: 'Orgulho e Preconceito',
    author: 'Jane Austen',
    year: 1813,
    pages: 424,
    genres: ['classicos', 'romance'],
    description: 'Elizabeth Bennet, Darcy e a comedia social mais bem calibrada da literatura inglesa.',
  },
  {
    slug: 'it-a-coisa',
    title: 'It: A Coisa',
    author: 'Stephen King',
    year: 1986,
    pages: 1104,
    genres: ['terror', 'suspense'],
    description: 'Sete criancas enfrentam algo que volta a cada 27 anos. Trinta anos depois, precisam voltar tambem.',
  },
  {
    slug: 'o-iluminado',
    title: 'O Iluminado',
    author: 'Stephen King',
    year: 1977,
    pages: 464,
    genres: ['terror'],
    description: 'Um hotel vazio no inverno, um escritor em crise e um menino que enxerga o que ninguem quer ver.',
  },
  {
    slug: 'assassinato-no-expresso-do-oriente',
    title: 'Assassinato no Expresso do Oriente',
    author: 'Agatha Christie',
    year: 1934,
    pages: 256,
    genres: ['misterio', 'suspense', 'classicos'],
    description: 'Um trem parado na neve, um corpo, doze suspeitos e Hercule Poirot.',
  },
  {
    slug: 'sapiens',
    title: 'Sapiens',
    subtitle: 'Uma breve historia da humanidade',
    author: 'Yuval Noah Harari',
    year: 2011,
    pages: 464,
    genres: ['historia', 'nao-ficcao'],
    description: 'Como uma especie irrelevante da savana passou a organizar o planeta em torno de ficcoes coletivas.',
  },
  {
    slug: 'habitos-atomicos',
    title: 'Habitos Atomicos',
    author: 'James Clear',
    year: 2018,
    pages: 320,
    genres: ['desenvolvimento-pessoal', 'nao-ficcao'],
    description: 'Mudancas de 1% ao dia, repetidas, superam qualquer surto de motivacao.',
  },
  {
    slug: 'a-arte-da-guerra',
    title: 'A Arte da Guerra',
    author: 'Sun Tzu',
    year: -500,
    pages: 128,
    genres: ['filosofia', 'classicos', 'nao-ficcao'],
    description: 'Tratado militar chines lido ha 2500 anos como manual de estrategia e de temperamento.',
  },
  {
    slug: 'o-senhor-dos-aneis-a-sociedade-do-anel',
    title: 'O Senhor dos Aneis: A Sociedade do Anel',
    author: 'J. R. R. Tolkien',
    year: 1954,
    pages: 576,
    genres: ['fantasia', 'classicos'],
    description: 'Um anel precisa ser destruido e o caminho ate la e longo. O livro que definiu a fantasia moderna.',
  },
  {
    slug: 'o-hobbit',
    title: 'O Hobbit',
    author: 'J. R. R. Tolkien',
    year: 1937,
    pages: 336,
    genres: ['fantasia', 'classicos'],
    description: 'Bilbo Bolseiro sai de casa sem lenco e volta outra pessoa.',
  },
  {
    slug: 'a-guerra-dos-tronos',
    title: 'A Guerra dos Tronos',
    author: 'George R. R. Martin',
    year: 1996,
    pages: 592,
    genres: ['fantasia'],
    description: 'Sete reinos, muitas casas e nenhuma garantia de que seu personagem favorito chega ao fim do livro.',
  },
  {
    slug: 'kafka-a-beira-mar',
    title: 'Kafka a Beira-Mar',
    author: 'Haruki Murakami',
    year: 2002,
    pages: 576,
    genres: ['ficcao', 'literatura-estrangeira'],
    description: 'Um adolescente foge de casa, um senhor conversa com gatos, e as duas historias se aproximam.',
  },
  {
    slug: 'o-pequeno-principe',
    title: 'O Pequeno Principe',
    author: 'Antoine de Saint-Exupery',
    year: 1943,
    pages: 96,
    genres: ['classicos', 'ficcao'],
    description: 'Um piloto no deserto encontra um menino que veio de outro planeta e faz as perguntas certas.',
  },
  {
    slug: 'meditacoes',
    title: 'Meditacoes',
    author: 'Marco Aurelio',
    year: 180,
    pages: 256,
    genres: ['filosofia', 'classicos', 'nao-ficcao'],
    description: 'Anotacoes privadas de um imperador tentando se manter decente. Nunca foram escritas para publicacao.',
  },
];

export interface SeedUser {
  username: string;
  name: string;
  email: string;
  bio: string;
  location: string;
  genres: string[];
  reading: string[];
  read: string[];
  wantToRead: string[];
  favorites?: string[];
}

/** Pessoas ficticias criadas apenas para demonstrar o produto. */
export const USERS: SeedUser[] = [
  {
    username: 'guilherme',
    name: 'Guilherme',
    email: 'guilherme@retrobook.app',
    bio: 'Leio ficcao cientifica de manha e brasileiro a noite. Sempre atras de alguem para discutir finais.',
    location: 'Sao Paulo, SP',
    genres: ['ficcao-cientifica', 'literatura-brasileira', 'fantasia', 'filosofia'],
    reading: ['duna', 'grande-sertao-veredas'],
    read: ['1984', 'memorias-postumas-de-bras-cubas', 'neuromancer', 'o-hobbit'],
    wantToRead: ['os-despossuidos', 'kafka-a-beira-mar'],
    favorites: ['1984', 'neuromancer'],
  },
  {
    username: 'ana.reis',
    name: 'Ana Reis',
    email: 'ana@retrobook.app',
    bio: 'Fantasia, mapas no inicio do livro e teorias improvaveis. Moderadora de plantao.',
    location: 'Curitiba, PR',
    genres: ['fantasia', 'ficcao-cientifica', 'misterio'],
    reading: ['duna', 'o-nome-do-vento'],
    read: ['o-hobbit', 'o-senhor-dos-aneis-a-sociedade-do-anel', 'a-guerra-dos-tronos', '1984'],
    wantToRead: ['a-mao-esquerda-da-escuridao'],
    favorites: ['o-nome-do-vento'],
  },
  {
    username: 'joao.mendes',
    name: 'Joao Mendes',
    email: 'joao@retrobook.app',
    bio: 'Professor de historia. Acredito que todo livro e um documento do seu tempo.',
    location: 'Recife, PE',
    genres: ['historia', 'nao-ficcao', 'classicos', 'filosofia'],
    reading: ['sapiens'],
    read: ['a-arte-da-guerra', 'meditacoes', '1984', 'a-revolucao-dos-bichos'],
    wantToRead: ['cem-anos-de-solidao'],
  },
  {
    username: 'marina.alves',
    name: 'Marina Alves',
    email: 'marina@retrobook.app',
    bio: 'Clarice mudou o jeito como eu leio tudo. Escrevo resenhas longas, desculpa.',
    location: 'Belo Horizonte, MG',
    genres: ['literatura-brasileira', 'poesia', 'ficcao'],
    reading: ['a-hora-da-estrela', 'grande-sertao-veredas'],
    read: ['dom-casmurro', 'memorias-postumas-de-bras-cubas', 'o-pequeno-principe'],
    wantToRead: ['cem-anos-de-solidao'],
    favorites: ['a-hora-da-estrela'],
  },
  {
    username: 'rafa.torres',
    name: 'Rafael Torres',
    email: 'rafael@retrobook.app',
    bio: 'Terror e suspense. Se tem casa mal-assombrada, eu leio.',
    location: 'Porto Alegre, RS',
    genres: ['terror', 'suspense', 'misterio'],
    reading: ['it-a-coisa'],
    read: ['o-iluminado', 'assassinato-no-expresso-do-oriente'],
    wantToRead: ['o-morro-dos-ventos-uivantes'],
  },
  {
    username: 'bea.lima',
    name: 'Beatriz Lima',
    email: 'beatriz@retrobook.app',
    bio: 'Distopias e literatura escrita por mulheres. Organizo leituras coletivas.',
    location: 'Salvador, BA',
    genres: ['distopia', 'ficcao', 'literatura-estrangeira'],
    reading: ['o-conto-da-aia', 'duna'],
    read: ['1984', 'a-revolucao-dos-bichos', 'a-menina-que-roubava-livros'],
    wantToRead: ['os-despossuidos', 'a-mao-esquerda-da-escuridao'],
    favorites: ['o-conto-da-aia'],
  },
  {
    username: 'caio.duarte',
    name: 'Caio Duarte',
    email: 'caio@retrobook.app',
    bio: 'Ficcao cientifica dura e ensaios sobre tecnologia. Anoto tudo na margem.',
    location: 'Florianopolis, SC',
    genres: ['ficcao-cientifica', 'filosofia', 'nao-ficcao'],
    reading: ['neuromancer', 'duna'],
    read: ['os-despossuidos', 'a-mao-esquerda-da-escuridao', 'sapiens'],
    wantToRead: ['1984'],
  },
  {
    username: 'lu.fernandes',
    name: 'Luiza Fernandes',
    email: 'luiza@retrobook.app',
    bio: 'Classicos ingleses e cha. Releio Austen todo ano sem constrangimento.',
    location: 'Niteroi, RJ',
    genres: ['classicos', 'romance', 'literatura-estrangeira'],
    reading: ['o-morro-dos-ventos-uivantes'],
    read: ['orgulho-e-preconceito', 'dom-casmurro'],
    wantToRead: ['a-menina-que-roubava-livros'],
    favorites: ['orgulho-e-preconceito'],
  },
  {
    username: 'pedro.sa',
    name: 'Pedro Sa',
    email: 'pedro@retrobook.app',
    bio: 'Comeco cinco livros ao mesmo tempo e termino um. Estou trabalhando nisso.',
    location: 'Fortaleza, CE',
    genres: ['desenvolvimento-pessoal', 'nao-ficcao', 'ficcao'],
    reading: ['habitos-atomicos', 'sapiens'],
    read: ['o-pequeno-principe'],
    wantToRead: ['meditacoes', 'duna'],
  },
  {
    username: 'nina.costa',
    name: 'Nina Costa',
    email: 'nina@retrobook.app',
    bio: 'Murakami, gatos e livros que nao explicam tudo.',
    location: 'Sao Paulo, SP',
    genres: ['ficcao', 'literatura-estrangeira', 'poesia'],
    reading: ['kafka-a-beira-mar'],
    read: ['cem-anos-de-solidao', 'a-hora-da-estrela'],
    wantToRead: ['grande-sertao-veredas'],
  },
  {
    username: 'tiago.ramos',
    name: 'Tiago Ramos',
    email: 'tiago@retrobook.app',
    bio: 'Fantasia epica e planilhas de leitura. Sim, as duas coisas.',
    location: 'Campinas, SP',
    genres: ['fantasia', 'ficcao-cientifica'],
    reading: ['a-guerra-dos-tronos', 'o-nome-do-vento'],
    read: ['o-hobbit', 'o-senhor-dos-aneis-a-sociedade-do-anel'],
    wantToRead: ['duna'],
  },
  {
    username: 'helo.martins',
    name: 'Heloisa Martins',
    email: 'heloisa@retrobook.app',
    bio: 'Investigo assassinatos ficticios desde os doze anos.',
    location: 'Brasilia, DF',
    genres: ['misterio', 'suspense', 'classicos'],
    reading: ['assassinato-no-expresso-do-oriente'],
    read: ['it-a-coisa', 'o-iluminado', 'orgulho-e-preconceito'],
    wantToRead: ['o-morro-dos-ventos-uivantes'],
  },
];

export interface SeedCommunity {
  activity?: SeedActivity;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  genre: string;
  accentColor: string;
  privacy: 'PUBLIC' | 'PRIVATE' | 'EXCLUSIVE';
  owner: string;
  moderators: string[];
  members: string[];
  tags: string[];
  books: string[];
  rules: { title: string; description?: string }[];
}

export const COMMUNITIES: SeedCommunity[] = [
  {
    activity: 'thriving',
    slug: 'universos-fantasticos',
    name: 'Universos Fantasticos',
    tagline: 'Mundos, mitologias e teorias.',
    description:
      'Para quem gosta de discutir mundos inventados: sistemas de magia, mapas, genealogias improvaveis e aquela teoria que voce ainda nao contou para ninguem. Fantasia de todos os tamanhos, do conto ao calhamaco.',
    genre: 'fantasia',
    accentColor: '#7B2E3A',
    privacy: 'PUBLIC',
    owner: 'ana.reis',
    moderators: ['tiago.ramos'],
    members: ['guilherme', 'bea.lima', 'caio.duarte', 'nina.costa'],
    tags: ['fantasia', 'worldbuilding', 'teorias'],
    books: ['o-nome-do-vento', 'o-hobbit', 'o-senhor-dos-aneis-a-sociedade-do-anel', 'a-guerra-dos-tronos'],
    rules: [
      { title: 'Respeite quem esta lendo pela primeira vez', description: 'Todo mundo ja foi novo em alguma saga.' },
      { title: 'Marque spoilers', description: 'Use o aviso de spoiler e diga ate onde ele vai.' },
      { title: 'Teoria e bem-vinda, certeza nem tanto', description: 'Argumente com o texto.' },
      { title: 'Nada de pirataria', description: 'Nao compartilhe arquivos de livros protegidos.' },
    ],
  },
  {
    activity: 'thriving',
    slug: 'clube-duna',
    name: 'Clube Duna',
    tagline: 'Lendo Arrakis, capitulo a capitulo.',
    description:
      'Leitura coletiva de Duna. Avancamos por blocos combinados e discutimos ecologia, religiao e politica do deserto sem estragar o livro para quem esta atras.',
    genre: 'ficcao-cientifica',
    accentColor: '#C89B3C',
    privacy: 'PUBLIC',
    owner: 'caio.duarte',
    moderators: ['bea.lima'],
    members: ['guilherme', 'ana.reis', 'tiago.ramos', 'pedro.sa'],
    tags: ['duna', 'leitura-coletiva', 'ficcao-cientifica'],
    books: ['duna'],
    rules: [
      { title: 'Respeite o ritmo do grupo', description: 'Nada de comentar alem do bloco da semana.' },
      { title: 'Todo spoiler vem com aviso', description: 'Diga ate qual capitulo voce leu.' },
      { title: 'Duvida boba nao existe' },
    ],
  },
  {
    activity: 'active',
    slug: 'brasil-em-paginas',
    name: 'Brasil em Paginas',
    tagline: 'Machado, Clarice, Rosa e quem vem depois.',
    description:
      'Literatura brasileira sem solenidade. Lemos classicos e contemporaneos, comparamos edicoes, discutimos traducoes para outras linguas e indicamos autoria nova.',
    genre: 'literatura-brasileira',
    accentColor: '#3E7C59',
    privacy: 'PUBLIC',
    owner: 'marina.alves',
    moderators: ['nina.costa'],
    members: ['guilherme', 'joao.mendes', 'lu.fernandes'],
    tags: ['brasil', 'classicos', 'clarice'],
    books: ['grande-sertao-veredas', 'dom-casmurro', 'memorias-postumas-de-bras-cubas', 'a-hora-da-estrela'],
    rules: [
      { title: 'Sem esnobismo', description: 'Ninguem precisa provar que leu o suficiente para participar.' },
      { title: 'Cite a edicao', description: 'Ajuda muito nas discussoes de traducao e notas.' },
      { title: 'Spoiler de classico tambem e spoiler' },
    ],
  },
  {
    activity: 'quiet',
    slug: 'noite-sem-fim',
    name: 'Noite Sem Fim',
    tagline: 'Terror, suspense e o que range no corredor.',
    description:
      'Comunidade para quem le com a luz acesa. Discussoes sobre terror classico e contemporaneo, adaptacoes e aquela cena que ninguem consegue esquecer.',
    genre: 'terror',
    accentColor: '#211F1C',
    privacy: 'PUBLIC',
    owner: 'rafa.torres',
    moderators: ['helo.martins'],
    members: ['bea.lima', 'pedro.sa'],
    tags: ['terror', 'suspense', 'king'],
    books: ['it-a-coisa', 'o-iluminado'],
    rules: [
      { title: 'Aviso de gatilho quando fizer sentido', description: 'Terror pode doer de verdade em alguem.' },
      { title: 'Spoiler marcado, sempre' },
      { title: 'Sem julgar o medo dos outros' },
    ],
  },
  {
    activity: 'active',
    slug: 'futuros-possiveis',
    name: 'Futuros Possiveis',
    tagline: 'Ficcao cientifica como experimento mental.',
    description:
      'Le Guin, Gibson, Herbert e quem veio depois. Discutimos as perguntas que a ficcao cientifica faz sobre poder, corpo, trabalho e ecologia.',
    genre: 'ficcao-cientifica',
    accentColor: '#4A5C7A',
    privacy: 'PUBLIC',
    owner: 'caio.duarte',
    moderators: [],
    members: ['guilherme', 'bea.lima', 'ana.reis'],
    tags: ['ficcao-cientifica', 'utopia', 'distopia'],
    books: ['neuromancer', 'a-mao-esquerda-da-escuridao', 'os-despossuidos', 'duna'],
    rules: [
      { title: 'Discuta a ideia, nao a pessoa' },
      { title: 'Marque spoiler de obra recente' },
    ],
  },
  {
    activity: 'quiet',
    slug: 'sala-de-leitura-fechada',
    name: 'Sala de Leitura',
    tagline: 'Um grupo pequeno, uma leitura por vez.',
    description:
      'Grupo fechado de amigos que le um livro por mes e conversa com calma. Entrada por aprovacao — usamos este espaco como diario coletivo de leitura.',
    genre: 'ficcao',
    accentColor: '#8A6A3B',
    privacy: 'EXCLUSIVE',
    owner: 'marina.alves',
    moderators: [],
    members: ['nina.costa'],
    tags: ['clube', 'leitura-lenta'],
    books: ['kafka-a-beira-mar'],
    rules: [
      { title: 'O que se conta aqui fica aqui' },
      { title: 'Uma leitura por vez' },
    ],
  },
];

/**
 * Perfis de atividade usados pelo seed para dar personalidade a cada
 * comunidade — o que permite ver na tela como a interface se comporta em
 * comunidade viva, calma, nova e abandonada (secao 48).
 */
export type SeedActivity = 'thriving' | 'active' | 'quiet' | 'new' | 'dormant';

export const EXTRA_COMMUNITIES: SeedCommunity[] = [
  {
    activity: 'new',
    slug: 'poesia-de-quinta',
    name: 'Poesia de Quinta',
    tagline: 'Um poema por semana, sem pressa.',
    description:
      'Comunidade recem-criada para ler e comentar um poema por semana. Sem analise academica, sem obrigacao: so o poema e o que ele provoca.',
    genre: 'poesia',
    accentColor: '#5C4A7A',
    privacy: 'PUBLIC',
    owner: 'nina.costa',
    moderators: [],
    members: [],
    tags: ['poesia', 'leitura-lenta'],
    books: [],
    rules: [{ title: 'Um poema por vez' }, { title: 'Interpretacao pessoal e bem-vinda' }],
  },
  {
    activity: 'dormant',
    slug: 'classicos-esquecidos',
    name: 'Classicos Esquecidos',
    tagline: 'Livros que ninguem mais cita.',
    description:
      'Espaco criado para resgatar obras que sairam de circulacao. A conversa esfriou, mas o acervo continua aqui esperando alguem reacender.',
    genre: 'classicos',
    accentColor: '#6B4423',
    privacy: 'PUBLIC',
    owner: 'joao.mendes',
    moderators: [],
    members: ['lu.fernandes', 'marina.alves'],
    tags: ['classicos', 'resgate'],
    books: ['meditacoes', 'a-arte-da-guerra'],
    rules: [{ title: 'Toda obra merece contexto' }],
  },
];

export interface SeedPost {
  community?: string;
  book?: string;
  author: string;
  type: 'DISCUSSION' | 'THEORY' | 'REVIEW' | 'QUESTION' | 'QUOTE';
  title?: string;
  content: string;
  spoiler?: boolean;
  spoilerScope?: string;
  quote?: string;
  quotePage?: number;
  tags?: string[];
  daysAgo: number;
  comments: { author: string; content: string; spoiler?: boolean; replies?: { author: string; content: string }[] }[];
}

export const POSTS: SeedPost[] = [
  {
    community: 'clube-duna',
    book: 'duna',
    author: 'caio.duarte',
    type: 'DISCUSSION',
    title: 'Bloco 3: o deserto como personagem',
    content:
      'Cheguei ao fim do bloco desta semana e o que mais me pegou nao foi a politica: foi como Arrakis molda cada decisao. A agua deixa de ser recurso e vira moral. Alguem mais leu assim ou estou forcando a leitura ecologica?',
    tags: ['duna', 'ecologia'],
    daysAgo: 1,
    comments: [
      {
        author: 'guilherme',
        content:
          'Nao esta forcando nao. Reparei que quase toda regra social dos fremen existe para justificar o uso da agua. E economia virando religiao.',
        replies: [
          {
            author: 'caio.duarte',
            content: 'Exato. E quando o ritual aparece antes da explicacao, o livro te obriga a aceitar a logica deles primeiro.',
          },
        ],
      },
      {
        author: 'ana.reis',
        content: 'Estou um bloco atras, mas ja da para sentir isso nos primeiros capitulos. Nao me contem nada.',
      },
    ],
  },
  {
    community: 'clube-duna',
    book: 'duna',
    author: 'bea.lima',
    type: 'THEORY',
    title: 'Uma teoria sobre as Bene Gesserit',
    content:
      'Tenho a impressao de que o plano delas nunca foi controlar o resultado, e sim garantir que exista sempre uma proxima geracao para tentar de novo. Elas jogam em escala de seculos, entao errar uma vez faz parte do metodo.',
    spoiler: true,
    spoilerScope: 'Ate a parte 2',
    tags: ['duna', 'teoria'],
    daysAgo: 3,
    comments: [
      {
        author: 'caio.duarte',
        content: 'Isso explicaria por que elas parecem calmas demais quando o plano desanda.',
        spoiler: true,
      },
    ],
  },
  {
    community: 'universos-fantasticos',
    book: 'o-nome-do-vento',
    author: 'ana.reis',
    type: 'QUESTION',
    title: 'Vale a pena continuar a serie?',
    content:
      'Terminei o primeiro livro ontem e fiquei com aquela sensacao boa de nao querer sair do mundo. Antes de comecar o segundo: quem ja leu acha que a historia se sustenta ou o ritmo cai?',
    tags: ['fantasia'],
    daysAgo: 2,
    comments: [
      { author: 'tiago.ramos', content: 'O segundo tem trechos maravilhosos e outros que se arrastam. Vale, mas ajuste a expectativa.' },
      { author: 'nina.costa', content: 'Eu li os dois seguidos e me arrependi. Deixe respirar um pouco entre eles.' },
      {
        author: 'guilherme',
        content: 'Depende do que te prendeu. Se foi a prosa, vale. Se foi a trama avancando, talvez frustre.',
      },
    ],
  },
  {
    community: 'universos-fantasticos',
    author: 'tiago.ramos',
    type: 'DISCUSSION',
    title: 'Sistemas de magia com regra explicita cansaram?',
    content:
      'Percebi que ando gostando mais de fantasia onde a magia continua estranha ate o fim. Quando tudo vira tabela de custo e beneficio, perco um pouco do encantamento. Ou sou so eu?',
    tags: ['worldbuilding'],
    daysAgo: 5,
    comments: [
      { author: 'ana.reis', content: 'Acho que precisamos dos dois. Regra clara ajuda a tensao, misterio ajuda a atmosfera.' },
      { author: 'caio.duarte', content: 'Le Guin resolve isso bem: tem regra, mas ela e etica, nao mecanica.' },
    ],
  },
  {
    community: 'brasil-em-paginas',
    book: 'a-hora-da-estrela',
    author: 'marina.alves',
    type: 'REVIEW',
    title: 'Terminei ontem e ainda estou processando',
    content:
      'Sao noventa e poucas paginas e eu levei uma semana. Nao pela dificuldade: e que a cada duas paginas eu precisava parar. O narrador se coloca no caminho da propria historia o tempo todo, e isso me deixou desconfortavel do jeito certo.',
    tags: ['clarice'],
    daysAgo: 4,
    comments: [
      { author: 'nina.costa', content: 'A parte em que ele admite que talvez nao tenha direito de contar aquilo me derrubou.' },
      {
        author: 'guilherme',
        content: 'Comprei semana passada por sua indicacao. Comeco hoje.',
        replies: [{ author: 'marina.alves', content: 'Depois me conta. Nao leia com pressa.' }],
      },
    ],
  },
  {
    community: 'brasil-em-paginas',
    book: 'dom-casmurro',
    author: 'joao.mendes',
    type: 'DISCUSSION',
    title: 'Capitu traiu? A pergunta errada',
    content:
      'Uso esse livro em sala todo ano e a discussao sempre trava na mesma pergunta. Proponho outra: por que Bentinho precisa tanto que a gente acredite nele? A resposta diz mais sobre o romance do que qualquer veredito.',
    tags: ['machado'],
    daysAgo: 7,
    comments: [
      { author: 'marina.alves', content: 'Concordo. O livro e sobre o narrador construindo um caso, nao sobre o caso.' },
      { author: 'lu.fernandes', content: 'Li aos 15 achando que era romance e aos 30 achando que era terror.' },
    ],
  },
  {
    community: 'noite-sem-fim',
    book: 'it-a-coisa',
    author: 'rafa.torres',
    type: 'DISCUSSION',
    title: 'A parte da infancia e melhor que a parte adulta?',
    content:
      'Estou na metade e a sensacao e de que os capitulos de 1958 tem uma energia que os de 1985 nao alcançam. Quem terminou consegue me dizer se isso muda sem estragar nada?',
    daysAgo: 2,
    comments: [
      { author: 'helo.martins', content: 'Muda sim, mas de um jeito diferente. Segue.' },
      { author: 'bea.lima', content: 'Achei o contrario. A parte adulta me pegou mais justamente por ser sobre memoria.' },
    ],
  },
  {
    community: 'futuros-possiveis',
    book: 'a-mao-esquerda-da-escuridao',
    author: 'caio.duarte',
    type: 'QUOTE',
    title: 'A frase que resume o livro para mim',
    content: 'Reli esse trecho tres vezes. E o coracao do romance em uma linha.',
    quote: 'Luz e a mao esquerda da escuridao, e escuridao a mao direita da luz.',
    quotePage: 233,
    tags: ['le-guin'],
    daysAgo: 6,
    comments: [{ author: 'bea.lima', content: 'Esse trecho aparece como poema dentro do livro e funciona como chave de leitura.' }],
  },
  {
    book: 'duna',
    author: 'guilherme',
    type: 'QUESTION',
    title: 'Quem mais esta lendo Duna agora?',
    content:
      'Comecei ha duas semanas e estou na pagina 182. Queria conversar com alguem que esteja mais ou menos no mesmo ponto, sem risco de spoiler.',
    tags: ['duna'],
    daysAgo: 1,
    comments: [
      { author: 'bea.lima', content: 'Estou na 210. Podemos combinar de comentar so ate o fim da parte 1.' },
      { author: 'ana.reis', content: 'Entrei agora, pagina 40. Vou acompanhar de longe.' },
    ],
  },
  {
    book: 'o-conto-da-aia',
    author: 'bea.lima',
    type: 'REVIEW',
    title: 'O incomodo e o ponto',
    content:
      'Nao e um livro para gostar, e um livro para atravessar. O que me impressiona e como Atwood constroi Gilead so com detalhes domesticos: a comida, o tecido, a rotina. O horror mora na normalidade.',
    daysAgo: 8,
    comments: [{ author: 'marina.alves', content: 'A escolha de nunca dar o nome verdadeiro dela e devastadora.' }],
  },
];

export interface SeedReview {
  user: string;
  book: string;
  rating: number;
  title: string;
  content: string;
  spoiler?: boolean;
}

export const REVIEWS: SeedReview[] = [
  {
    user: 'guilherme',
    book: '1984',
    rating: 5,
    title: 'A parte mais assustadora e o apendice',
    content:
      'Todo mundo lembra da vigilancia, mas o que me marcou foi a novilingua. Reduzir o vocabulario para reduzir o que pode ser pensado e a ideia mais perturbadora do livro.',
  },
  {
    user: 'ana.reis',
    book: 'o-nome-do-vento',
    rating: 5,
    title: 'A prosa carrega o livro inteiro',
    content:
      'A trama as vezes anda devagar, e nao me importei uma vez sequer. Rothfuss escreve como quem toca um instrumento. A Universidade e o melhor cenario de fantasia que li em anos.',
  },
  {
    user: 'marina.alves',
    book: 'dom-casmurro',
    rating: 5,
    title: 'Machado inventou o narrador nao confiavel antes da moda',
    content:
      'Cada releitura muda de lugar. Aos vinte anos eu tinha certeza; hoje tenho duvida, que e exatamente onde o livro quer que eu fique.',
  },
  {
    user: 'joao.mendes',
    book: 'sapiens',
    rating: 4,
    title: 'Otimo para provocar, exige leitura critica',
    content:
      'Sintetiza bem e provoca melhor ainda, mas simplifica demais em alguns capitulos. Uso em aula sempre acompanhado de contraponto.',
  },
  {
    user: 'rafa.torres',
    book: 'o-iluminado',
    rating: 5,
    title: 'O hotel e o segundo melhor personagem',
    content: 'King demora para assustar e e exatamente por isso que assusta. A construcao da deterioracao do Jack e impecavel.',
  },
  {
    user: 'bea.lima',
    book: 'a-menina-que-roubava-livros',
    rating: 4,
    title: 'A narradora salva o livro',
    content: 'A escolha da Morte como narradora poderia ter sido truque e virou o coracao do romance.',
  },
  {
    user: 'lu.fernandes',
    book: 'orgulho-e-preconceito',
    rating: 5,
    title: 'Releio todo ano e sempre acho piada nova',
    content: 'A comedia social continua afiada dois seculos depois. A senhora Bennet e um monumento.',
  },
  {
    user: 'caio.duarte',
    book: 'os-despossuidos',
    rating: 5,
    title: 'Utopia ambigua e a melhor especie de utopia',
    content:
      'Le Guin nao vende a sociedade anarquista como perfeita, e e justamente por mostrar as rachaduras que o argumento convence.',
  },
  {
    user: 'nina.costa',
    book: 'cem-anos-de-solidao',
    rating: 5,
    title: 'Uma arvore genealogica e um caderno ajudam',
    content: 'Os nomes se repetem de proposito. Depois que voce aceita isso, o livro abre.',
  },
  {
    user: 'helo.martins',
    book: 'assassinato-no-expresso-do-oriente',
    rating: 4,
    title: 'A solucao mais elegante que ja li',
    content: 'Christie joga limpo: todas as pistas estao la. Eu que nao vi.',
  },
];

/**
 * Catalogo de planos — dado de referencia, nao dado de demonstracao.
 *
 * Vive aqui, e nao dentro de seed.ts, porque producao e desenvolvimento
 * precisam dos MESMOS limites. Se o seed de producao tivesse a propria copia,
 * um plano gratuito com limite diferente passaria despercebido ate um usuario
 * real ser bloqueado (ou liberado) fora da regra.
 */
export const PLANS = [
  {
    tier: 'FREE',
    name: 'Leitor',
    tagline: 'Para comecar a encontrar sua gente.',
    priceCents: 0,
    maxCommunities: 1,
    maxMembersPerCommunity: 3,
    allowPrivateCommunities: false,
    allowAnalytics: false,
    allowCustomBranding: false,
    advancedModeration: false,
  },
  {
    tier: 'PRO',
    name: 'Pro',
    tagline: 'Para quem cuida de uma comunidade de verdade.',
    priceCents: 1990,
    maxCommunities: 10,
    maxMembersPerCommunity: 5000,
    allowPrivateCommunities: true,
    allowAnalytics: true,
    allowCustomBranding: true,
    advancedModeration: true,
  },
  {
    tier: 'BUSINESS',
    name: 'Editorial',
    tagline: 'Para editoras, autoria e clubes de leitura.',
    priceCents: 9900,
    maxCommunities: 100,
    maxMembersPerCommunity: 100000,
    allowPrivateCommunities: true,
    allowAnalytics: true,
    allowCustomBranding: true,
    advancedModeration: true,
    isPubliclyListed: false,
  },
] as const;
