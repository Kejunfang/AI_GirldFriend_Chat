CREATE TYPE "ChannelType" AS ENUM ('WEB', 'WECHAT_OFFICIAL', 'WECHAT_WORK');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "MemoryType" AS ENUM ('PROFILE', 'PREFERENCE', 'RECENT_STATE', 'SHARED_MEMORY', 'DISLIKE');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "channel" "ChannelType" NOT NULL DEFAULT 'WEB',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "MessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memories" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "MemoryType" NOT NULL,
  "content" TEXT NOT NULL,
  "importance" INTEGER NOT NULL DEFAULT 5,
  "sourceConversationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_externalId_key" ON "users"("externalId");
CREATE INDEX "conversations_userId_lastMessageAt_idx" ON "conversations"("userId", "lastMessageAt");
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX "messages_userId_createdAt_idx" ON "messages"("userId", "createdAt");
CREATE INDEX "memories_userId_type_updatedAt_idx" ON "memories"("userId", "type", "updatedAt");
CREATE INDEX "memories_userId_importance_idx" ON "memories"("userId", "importance");

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memories"
  ADD CONSTRAINT "memories_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
