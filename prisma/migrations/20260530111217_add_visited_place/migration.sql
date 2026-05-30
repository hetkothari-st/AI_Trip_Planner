-- CreateTable
CREATE TABLE "VisitedPlace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "regionName" TEXT,
    "lat" REAL,
    "lng" REAL,
    "startDate" TEXT,
    "endDate" TEXT,
    "budget" REAL,
    "activities" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "companions" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "VisitedPlace_clientId_idx" ON "VisitedPlace"("clientId");
