-- CreateTable
CREATE TABLE "Storybook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tripId" TEXT,
    "theme" TEXT NOT NULL,
    "sizePreset" TEXT NOT NULL DEFAULT 'square',
    "coverUrl" TEXT,
    "pages" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Storybook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintOrder" (
    "id" TEXT NOT NULL,
    "storybookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'requested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Storybook_userId_idx" ON "Storybook"("userId");

-- CreateIndex
CREATE INDEX "PrintOrder_userId_idx" ON "PrintOrder"("userId");
