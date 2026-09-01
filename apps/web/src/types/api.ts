/** Contratos da API do RetroBook, espelhando os serializers do backend. */

export type ReadingStatus = 'WANT_TO_READ' | 'READING' | 'PAUSED' | 'ABANDONED' | 'READ';
export type CommunityPrivacy = 'PUBLIC' | 'PRIVATE' | 'EXCLUSIVE';
export type CommunityRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
export type MembershipStatus = 'ACTIVE' | 'PENDING' | 'BANNED' | 'MUTED';
export type PostType = 'DISCUSSION' | 'THEORY' | 'REVIEW' | 'QUESTION' | 'QUOTE' | 'RECOMMENDATION' | 'READING_UPDATE';
export type SpoilerScopeType = 'GENERAL' | 'CHAPTER' | 'PAGE' | 'PART' | 'ENDING';
export type PlanTier = 'FREE' | 'PRO' | 'BUSINESS';
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';
export type SpoilerPreference = 'ALWAYS_HIDE' | 'HIDE_UNREAD' | 'ALWAYS_SHOW';
export type ProfileVisibility = 'PUBLIC' | 'PRIVATE';
export type ReadingGoal =
  | 'DISCOVER_BOOKS'
  | 'MEET_PEOPLE'
  | 'JOIN_COMMUNITIES'
  | 'DISCUSS_BOOKS'
  | 'TRACK_READING'
  | 'EVERYTHING';
export type NotificationType =
  | 'FOLLOW'
  | 'COMMENT'
  | 'REPLY'
  | 'REACTION'
  | 'COMMUNITY_POST'
  | 'COMMUNITY_JOIN_REQUEST'
  | 'COMMUNITY_JOIN_APPROVED'
  | 'BOOK_MATCH'
  | 'COMMUNITY_MATCH'
  | 'ACHIEVEMENT'
  | 'MESSAGE'
  | 'SYSTEM';

export interface PublicUser {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

export interface NamedRef {
  id: string;
  name: string;
  slug: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  publishedYear: number | null;
  ratingsAvg: number;
  ratingsCount: number;
  readersCount: number;
  readingCount: number;
  authors: NamedRef[];
  genres: NamedRef[];
  /** Presente nas recomendacoes: por que este livro apareceu. */
  reason?: string;
}

export interface BookDetail extends Book {
  description: string | null;
  publisher: string | null;
  language: string;
  isbn13: string | null;
  ratingDistribution: { star: number; count: number }[];
  readers: (PublicUser & { status: ReadingStatus; progress: number })[];
  communities: Community[];
  discussions: Post[];
  reviews: Review[];
  similar: Book[];
  viewerEntry: LibraryEntryState | null;
}

export interface LibraryEntryState {
  status: ReadingStatus;
  rating: number | null;
  progress: number;
  currentPage: number;
  isFavorite: boolean;
}

export interface LibraryEntry extends LibraryEntryState {
  startedAt: string | null;
  finishedAt: string | null;
  lastReadAt: string | null;
  book: Book;
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  containsSpoiler: boolean;
  likesCount?: number;
  createdAt: string;
  author?: PublicUser;
  book?: Book;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  accentColor: string | null;
  privacy: CommunityPrivacy;
  membersCount: number;
  postsCount: number;
  genre: NamedRef | null;
  tags: { slug: string; name: string }[];
  reasons?: string[];
  viewerMembership?: { communityId: string; status: MembershipStatus; role: CommunityRole } | null;
}

export interface CommunityRule {
  id: string;
  order: number;
  title: string;
  description: string | null;
}

export type PulseLevel = 'thriving' | 'active' | 'quiet' | 'dormant' | 'new';

/** Sinal de vida da comunidade — frase pronta, nunca um score cru. */
export interface CommunityPulse {
  level: PulseLevel;
  label: string;
  detail: string;
  signals: {
    postsLast7d: number;
    commentsLast7d: number;
    activeMembers7d: number;
    newMembers7d: number;
    lastActivityAt: string | null;
    replyRate: number;
  };
}

export type ActivityKind = 'joined' | 'discussed' | 'replied' | 'finished_book';

export interface ActivityItem {
  kind: ActivityKind;
  text: string;
  href?: string;
  at: string;
  actors: { id: string; name: string; username: string; avatarUrl: string | null }[];
  overflow: number;
}

export interface FeaturedDiscussion {
  post: Post & { participantsCount?: number; lastInteractionAt?: string };
  source: 'pinned' | 'trending';
}

export interface ActiveMember extends PublicUser {
  role: CommunityRole;
  postsCount: number;
  commentsCount: number;
}

export interface CommunityFeaturedBook {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  author: string | null;
  readingCount: number;
  collectiveProgress: number;
  discussionsCount: number;
}

export interface CommunityHealth {
  pulse: CommunityPulse;
  posts: { current: number; previous: number; growthPercent: number };
  members: { current: number; previous: number; growthPercent: number };
  replyRate: number;
  medianFirstReplyHours: number | null;
  openReports: number;
}

export interface CommunityDetail extends Community {
  createdAt: string;
  owner: PublicUser;
  allowMemberPosts: boolean;
  requireApproval: boolean;
  rules: CommunityRule[];
  books: Book[];
  moderators: (PublicUser & { role: CommunityRole })[];
  members: (PublicUser & { role: CommunityRole; joinedAt: string })[];
  similar: (Community & { reasons: string[] })[];
  pulse: CommunityPulse;
  featuredDiscussion: FeaturedDiscussion | null;
  recentActivity: ActivityItem[];
  activeMembers: ActiveMember[];
  featuredBook: CommunityFeaturedBook | null;
  belonging: { reasons: string[]; sharedBooks: number } | null;
  capacity: { membersCount: number; limit: number; tier: PlanTier; isFull: boolean };
  viewer: {
    membership: { role: CommunityRole; status: MembershipStatus; mutedUntil: string | null } | null;
    canViewContent: boolean;
    canPost: boolean;
    canModerate: boolean;
    isOwner: boolean;
    pendingRequests: number;
  };
}

export interface Post {
  id: string;
  type: PostType;
  title: string | null;
  content: string;
  containsSpoiler: boolean;
  spoilerScope: string | null;
  spoilerScopeType: SpoilerScopeType | null;
  spoilerScopeValue: number | null;
  /** Decidido no backend comparando o alcance do spoiler com o seu progresso. */
  viewerSpoiler: { hidden: boolean; label: string | null; explanation: string | null };
  quoteText: string | null;
  quotePage: number | null;
  progressPage: number | null;
  progressPercent: number | null;
  progressChapter: number | null;
  isPinned: boolean;
  isLocked: boolean;
  isRemoved: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: PublicUser;
  community: { id: string; slug: string; name: string; avatarUrl: string | null; accentColor: string | null; privacy: CommunityPrivacy } | null;
  book: { id: string; slug: string; title: string; coverUrl: string | null } | null;
  tags: { slug: string; name: string }[];
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  viewerCanModerate: boolean;
}

export interface Comment {
  id: string;
  parentId: string | null;
  content: string;
  containsSpoiler: boolean;
  isRemoved: boolean;
  likesCount: number;
  createdAt: string;
  author: PublicUser;
  viewerHasLiked: boolean;
  replies: Comment[];
}

export type ReasonKind =
  | 'shared_books'
  | 'shared_authors'
  | 'shared_genres'
  | 'shared_communities'
  | 'peer_recommended'
  | 'genre_match'
  | 'author_match'
  | 'community_activity'
  | 'reading_now'
  | 'serendipity'
  | 'popular';

export interface RecommendationReason {
  kind: ReasonKind;
  label: string;
  weight: number;
  count?: number;
}

export interface CompatibilityReason {
  kind: 'books' | 'authors' | 'genres' | 'communities';
  count: number;
  label: string;
}

export interface SuggestedPerson extends PublicUser {
  compatibility: number;
  reasons: RecommendationReason[];
  sharedBooksCount: number;
  sharedGenresCount: number;
  sharedCommunitiesCount: number;
  sharedBookIds?: string[];
  sharedCommunityIds?: string[];
  viewerIsFollowing: boolean;
}

export interface ConversationStarter {
  type: 'book' | 'community';
  id: string;
  slug: string;
  title: string;
  hint: string;
}

export interface Compatibility {
  score: number;
  reasons: CompatibilityReason[];
  sharedBooks: Book[];
  sharedGenres: NamedRef[];
  sharedCommunities: Community[];
  /** "Voces deveriam conversar sobre..." */
  conversationStarters: ConversationStarter[];
  agreementCount: number;
}

export interface Profile {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  website: string | null;
  pronouns: string | null;
  joinedAt: string;
  isSelf: boolean;
  viewerIsFollowing: boolean;
  followsViewer: boolean;
  allowMessages: boolean;
  visibility: { restricted: boolean; library: boolean; currentlyReading: boolean; activity: boolean; communities: boolean };
  followersCount: number;
  followingCount: number;
  stats: Partial<Record<ReadingStatus, number>>;
  currentlyReading: (Book & { progress: number; currentPage: number })[];
  favorites: Book[];
  recentlyRead: (Book & { rating: number | null })[];
  communities: Community[];
  reviews: Review[];
  achievements: { code: string; name: string; description: string; icon: string; unlockedAt: string }[];
  interests: NamedRef[];
  compatibility: Compatibility | null;
}

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  profile: {
    name: string;
    username: string;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    location: string | null;
    website: string | null;
    pronouns: string | null;
    goal: ReadingGoal;
    onboardingCompleted: boolean;
    onboardingStep: number;
    followersCount: number;
    followingCount: number;
  };
  settings: {
    visibility: ProfileVisibility;
    showLibrary: boolean;
    showCurrentlyReading: boolean;
    showActivity: boolean;
    showCommunities: boolean;
    allowMessages: boolean;
    theme: ThemePreference;
    spoilerPreference: SpoilerPreference;
    notifyComments: boolean;
    notifyFollowers: boolean;
    notifyCommunities: boolean;
    notifyRecommendations: boolean;
    notifyMessages: boolean;
  };
  plan: {
    tier: PlanTier;
    name: string;
    status: string;
    maxCommunities: number;
    maxMembersPerCommunity: number;
    allowPrivateCommunities: boolean;
    allowAnalytics: boolean;
    advancedModeration: boolean;
  } | null;
  counters: { unreadNotifications: number; communitiesCount: number; booksCount: number };
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: PublicUser | null;
}

export interface Conversation {
  id: string;
  with: PublicUser | null;
  lastMessage: { body: string | null; createdAt: string; senderId: string; hasAttachment: boolean } | null;
  lastMessageAt: string;
  unread: boolean;
}

export interface Message {
  id: string;
  body: string | null;
  createdAt: string;
  isMine: boolean;
  sender: PublicUser;
  sharedBook: Book | null;
  sharedCommunity: Community | null;
}

export type SignalKind = 'companions' | 'conversation' | 'community' | 'match' | 'recommendation' | 'welcome';

/** Frase pronta que diz o que mudou desde a ultima visita. */
export interface HomeSignal {
  kind: SignalKind;
  title: string;
  detail?: string;
  href: string;
  cta: string;
  priority: number;
  meta?: Record<string, unknown>;
}

export interface UniverseSlice {
  id: string;
  name: string;
  slug: string;
  count: number;
  percent: number;
}

export interface Universe {
  summary: {
    booksRead: number;
    booksReading: number;
    authors: number;
    genres: number;
    communities: number;
    averageRating: number | null;
  };
  genres: UniverseSlice[];
  authors: UniverseSlice[];
  communities: { id: string; name: string; slug: string; accentColor: string | null; membersCount: number }[];
  connections: { kindredReaders: number; communitiesInYourGenres: number; nextBooks: Book[] };
  isEmpty: boolean;
}

export interface BookPresence {
  readingCount: number;
  finishedCount: number;
  readers: (PublicUser & { progress: number; compatibility: number | null })[];
}

export interface FinishCelebration {
  book: { id: string; slug: string; title: string; coverUrl: string | null; pageCount: number | null };
  rating: number | null;
  hasReview: boolean;
  daysReading: number | null;
  pagesRead: number;
  companionsFinished: number;
  booksReadTotal: number;
  suggestedCommunities: { id: string; slug: string; name: string; accentColor: string | null; membersCount: number }[];
  suggestedNextBooks: { id: string; slug: string; title: string; coverUrl: string | null }[];
}

export interface HomeDashboard {
  signals: HomeSignal[];
  serendipity: (Book & { reason?: string })[];
  currentlyReading: LibraryEntry[];
  readingCompanions: { book: Book; othersCount: number; readers: PublicUser[] }[];
  suggestedPeople: SuggestedPerson[];
  communityDiscussions: Post[];
  recommendedCommunities: (Community & { reasons?: string[] })[];
  recommendedBooks: (Book & { reason?: string })[];
  friendsActivity: {
    user: PublicUser;
    book: Book;
    status: ReadingStatus;
    progress: number;
    rating: number | null;
    updatedAt: string;
  }[];
}

export interface ReadingStats {
  counts: Record<ReadingStatus, number>;
  totalBooks: number;
  pagesRead: number;
  averageRating: number | null;
  ratedCount: number;
  topGenre: { name: string; slug: string; count: number } | null;
  topAuthor: { name: string; slug: string; count: number } | null;
  topGenres: { name: string; slug: string; count: number }[];
  topAuthors: { name: string; slug: string; count: number }[];
  monthly: { label: string; key: string; pages: number; books: number }[];
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  unlockedAt: string | null;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  tagline: string;
  priceCents: number;
  currency: string;
  features: {
    maxCommunities: number;
    maxMembersPerCommunity: number;
    allowPrivateCommunities: boolean;
    allowAnalytics: boolean;
    allowCustomBranding: boolean;
    advancedModeration: boolean;
  };
}

export interface PlanUsage {
  tier: PlanTier;
  name: string;
  communities: { used: number; limit: number };
  members: { largest: number; limit: number; community: { name: string; slug: string; membersCount: number } | null };
  allowPrivateCommunities: boolean;
  allowAnalytics: boolean;
  advancedModeration: boolean;
}

export interface SearchResults {
  books: Book[];
  people: PublicUser[];
  communities: Community[];
  discussions: Post[];
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
