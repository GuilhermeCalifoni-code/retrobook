-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('WANT_TO_READ', 'READING', 'PAUSED', 'ABANDONED', 'READ');

-- CreateEnum
CREATE TYPE "CommunityPrivacy" AS ENUM ('PUBLIC', 'PRIVATE', 'EXCLUSIVE');

-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PENDING', 'BANNED', 'MUTED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('DISCUSSION', 'THEORY', 'REVIEW', 'QUESTION', 'QUOTE', 'RECOMMENDATION', 'READING_UPDATE');

-- CreateEnum
CREATE TYPE "SpoilerScopeType" AS ENUM ('GENERAL', 'CHAPTER', 'PAGE', 'PART', 'ENDING');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'INSIGHTFUL', 'LOVE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOW', 'COMMENT', 'REPLY', 'REACTION', 'COMMUNITY_POST', 'COMMUNITY_JOIN_REQUEST', 'COMMUNITY_JOIN_APPROVED', 'BOOK_MATCH', 'COMMUNITY_MATCH', 'ACHIEVEMENT', 'MESSAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT', 'USER', 'COMMUNITY', 'MESSAGE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SpoilerPreference" AS ENUM ('ALWAYS_HIDE', 'HIDE_UNREAD', 'ALWAYS_SHOW');

-- CreateEnum
CREATE TYPE "ReadingGoalIntent" AS ENUM ('DISCOVER_BOOKS', 'MEET_PEOPLE', 'JOIN_COMMUNITIES', 'DISCUSS_BOOKS', 'TRACK_READING', 'EVERYTHING');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "bio" VARCHAR(280),
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "location" TEXT,
    "website" TEXT,
    "pronouns" TEXT,
    "goal" "ReadingGoalIntent" NOT NULL DEFAULT 'EVERYTHING',
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "showLibrary" BOOLEAN NOT NULL DEFAULT true,
    "showCurrentlyReading" BOOLEAN NOT NULL DEFAULT true,
    "showActivity" BOOLEAN NOT NULL DEFAULT true,
    "showCommunities" BOOLEAN NOT NULL DEFAULT true,
    "allowMessages" BOOLEAN NOT NULL DEFAULT true,
    "theme" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "spoilerPreference" "SpoilerPreference" NOT NULL DEFAULT 'HIDE_UNREAD',
    "notifyComments" BOOLEAN NOT NULL DEFAULT true,
    "notifyFollowers" BOOLEAN NOT NULL DEFAULT true,
    "notifyCommunities" BOOLEAN NOT NULL DEFAULT true,
    "notifyRecommendations" BOOLEAN NOT NULL DEFAULT true,
    "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "booksReadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "coverUrl" TEXT,
    "pageCount" INTEGER,
    "publishedYear" INTEGER,
    "publisher" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "isbn13" TEXT,
    "isbn10" TEXT,
    "ratingsAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingsCount" INTEGER NOT NULL DEFAULT 0,
    "readersCount" INTEGER NOT NULL DEFAULT 0,
    "readingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookAuthor" (
    "bookId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BookAuthor_pkey" PRIMARY KEY ("bookId","authorId")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookGenre" (
    "bookId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "BookGenre_pkey" PRIMARY KEY ("bookId","genreId")
);

-- CreateTable
CREATE TABLE "UserGenre" (
    "userId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "UserGenre_pkey" PRIMARY KEY ("userId","genreId")
);

-- CreateTable
CREATE TABLE "UserBook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "status" "ReadingStatus" NOT NULL DEFAULT 'WANT_TO_READ',
    "rating" INTEGER,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "currentPage" INTEGER NOT NULL DEFAULT 0,
    "currentChapter" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL,
    "userBookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "pagesDelta" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "containsSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "accentColor" TEXT,
    "privacy" "CommunityPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "genreId" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowMemberPosts" BOOLEAN NOT NULL DEFAULT true,
    "requirePostApproval" BOOLEAN NOT NULL DEFAULT false,
    "membersCount" INTEGER NOT NULL DEFAULT 0,
    "postsCount" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "mutedUntil" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRule" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CommunityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityBook" (
    "communityId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityBook_pkey" PRIMARY KEY ("communityId","bookId")
);

-- CreateTable
CREATE TABLE "CommunityInvitation" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "communityId" TEXT,
    "bookId" TEXT,
    "type" "PostType" NOT NULL DEFAULT 'DISCUSSION',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "containsSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "spoilerScope" TEXT,
    "spoilerScopeType" "SpoilerScopeType",
    "spoilerScopeValue" INTEGER,
    "quoteText" TEXT,
    "quotePage" INTEGER,
    "progressPage" INTEGER,
    "progressPercent" INTEGER,
    "progressChapter" INTEGER,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "removedById" TEXT,
    "removedReason" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "containsSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "type" "ReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPost" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPost_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "CommunityTag" (
    "communityId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "CommunityTag_pkey" PRIMARY KEY ("communityId","tagId")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "Block" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT,
    "sharedBookId" TEXT,
    "sharedCommunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'reading',
    "threshold" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","achievementId")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "maxCommunities" INTEGER NOT NULL DEFAULT 1,
    "maxMembersPerCommunity" INTEGER NOT NULL DEFAULT 3,
    "allowPrivateCommunities" BOOLEAN NOT NULL DEFAULT false,
    "allowAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomBranding" BOOLEAN NOT NULL DEFAULT false,
    "advancedModeration" BOOLEAN NOT NULL DEFAULT false,
    "isPubliclyListed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewsAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- CreateIndex
CREATE INDEX "Profile_username_idx" ON "Profile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_purpose_idx" ON "AuthToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_provider_providerUserId_key" ON "SocialAccount"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Book_slug_key" ON "Book"("slug");

-- CreateIndex
CREATE INDEX "Book_title_idx" ON "Book"("title");

-- CreateIndex
CREATE INDEX "Book_readersCount_idx" ON "Book"("readersCount");

-- CreateIndex
CREATE UNIQUE INDEX "Book_provider_externalId_key" ON "Book"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE INDEX "Author_name_idx" ON "Author"("name");

-- CreateIndex
CREATE INDEX "BookAuthor_authorId_idx" ON "BookAuthor"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE INDEX "BookGenre_genreId_idx" ON "BookGenre"("genreId");

-- CreateIndex
CREATE INDEX "UserGenre_genreId_idx" ON "UserGenre"("genreId");

-- CreateIndex
CREATE INDEX "UserBook_userId_status_idx" ON "UserBook"("userId", "status");

-- CreateIndex
CREATE INDEX "UserBook_bookId_status_idx" ON "UserBook"("bookId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserBook_userId_bookId_key" ON "UserBook"("userId", "bookId");

-- CreateIndex
CREATE INDEX "ReadingProgress_userId_createdAt_idx" ON "ReadingProgress"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingProgress_userBookId_idx" ON "ReadingProgress"("userBookId");

-- CreateIndex
CREATE INDEX "Review_bookId_createdAt_idx" ON "Review"("bookId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_bookId_key" ON "Review"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_privacy_membersCount_idx" ON "Community"("privacy", "membersCount");

-- CreateIndex
CREATE INDEX "Community_genreId_idx" ON "Community"("genreId");

-- CreateIndex
CREATE INDEX "CommunityMember_userId_status_idx" ON "CommunityMember"("userId", "status");

-- CreateIndex
CREATE INDEX "CommunityMember_communityId_role_idx" ON "CommunityMember"("communityId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_communityId_userId_key" ON "CommunityMember"("communityId", "userId");

-- CreateIndex
CREATE INDEX "CommunityRule_communityId_order_idx" ON "CommunityRule"("communityId", "order");

-- CreateIndex
CREATE INDEX "CommunityBook_bookId_idx" ON "CommunityBook"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityInvitation_token_key" ON "CommunityInvitation"("token");

-- CreateIndex
CREATE INDEX "CommunityInvitation_communityId_status_idx" ON "CommunityInvitation"("communityId", "status");

-- CreateIndex
CREATE INDEX "CommunityInvitation_inviteeId_status_idx" ON "CommunityInvitation"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "Post_communityId_createdAt_idx" ON "Post"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_bookId_createdAt_idx" ON "Post"("bookId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Reaction_postId_idx" ON "Reaction"("postId");

-- CreateIndex
CREATE INDEX "Reaction_commentId_idx" ON "Reaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_postId_key" ON "Reaction"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_commentId_key" ON "Reaction"("userId", "commentId");

-- CreateIndex
CREATE INDEX "SavedPost_postId_idx" ON "SavedPost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "PostTag_tagId_idx" ON "PostTag"("tagId");

-- CreateIndex
CREATE INDEX "CommunityTag_tagId_idx" ON "CommunityTag"("tagId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "ProductEvent_name_createdAt_idx" ON "ProductEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_userId_createdAt_idx" ON "ProductEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_entityType_entityId_idx" ON "ProductEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookGenre" ADD CONSTRAINT "BookGenre_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookGenre" ADD CONSTRAINT "BookGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGenre" ADD CONSTRAINT "UserGenre_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGenre" ADD CONSTRAINT "UserGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBook" ADD CONSTRAINT "UserBook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBook" ADD CONSTRAINT "UserBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userBookId_fkey" FOREIGN KEY ("userBookId") REFERENCES "UserBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRule" ADD CONSTRAINT "CommunityRule_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBook" ADD CONSTRAINT "CommunityBook_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBook" ADD CONSTRAINT "CommunityBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityInvitation" ADD CONSTRAINT "CommunityInvitation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityInvitation" ADD CONSTRAINT "CommunityInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityInvitation" ADD CONSTRAINT "CommunityInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityTag" ADD CONSTRAINT "CommunityTag_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityTag" ADD CONSTRAINT "CommunityTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sharedBookId_fkey" FOREIGN KEY ("sharedBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sharedCommunityId_fkey" FOREIGN KEY ("sharedCommunityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

