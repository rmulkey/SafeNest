-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "sourcePageUrl" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateLinkStatus" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "lastChecked" TIMESTAMP(3) NOT NULL,
    "httpStatus" INTEGER,
    "isHealthy" BOOLEAN NOT NULL DEFAULT true,
    "flaggedAt" TIMESTAMP(3),

    CONSTRAINT "AffiliateLinkStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "klaviyoId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_reviewSlug_key" ON "Favorite"("userId", "reviewSlug");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "AffiliateClick_productId_idx" ON "AffiliateClick"("productId");

-- CreateIndex
CREATE INDEX "AffiliateClick_timestamp_idx" ON "AffiliateClick"("timestamp");

-- CreateIndex
CREATE INDEX "AffiliateClick_partnerId_timestamp_idx" ON "AffiliateClick"("partnerId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateLinkStatus_productId_partnerId_key" ON "AffiliateLinkStatus"("productId", "partnerId");

-- CreateIndex
CREATE INDEX "AffiliateLinkStatus_isHealthy_idx" ON "AffiliateLinkStatus"("isHealthy");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_email_idx" ON "NewsletterSubscription"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_ageRange_idx" ON "NewsletterSubscription"("ageRange");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
