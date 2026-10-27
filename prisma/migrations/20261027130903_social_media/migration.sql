-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "name" TEXT,
    "externalId" TEXT,
    "accessToken" TEXT,
    "lastSyncedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "text" TEXT,
    "format" TEXT NOT NULL DEFAULT 'post',
    "permalink" TEXT,
    "postedAt" DATETIME NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SocialMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'comment',
    "externalId" TEXT NOT NULL,
    "author" TEXT,
    "text" TEXT NOT NULL,
    "permalink" TEXT,
    "receivedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "category" TEXT NOT NULL DEFAULT 'general',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FollowerSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "followers" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual'
);

-- CreateTable
CREATE TABLE "SocialTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "platform" TEXT,
    "dueDate" DATETIME,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_platform_key" ON "SocialAccount"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPost_platform_externalId_key" ON "SocialPost"("platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMessage_platform_externalId_key" ON "SocialMessage"("platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerSnapshot_platform_date_key" ON "FollowerSnapshot"("platform", "date");
