-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "destination" TEXT NOT NULL,
    "region" TEXT,
    "startStopId" TEXT,
    "endStopId" TEXT,
    "optimized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TripStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "days" INTEGER NOT NULL DEFAULT 1,
    "miniItinerary" TEXT,
    "notes" TEXT,
    CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripStopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER,
    "category" TEXT,
    "lat" REAL,
    "lng" REAL,
    CONSTRAINT "Spot_tripStopId_fkey" FOREIGN KEY ("tripStopId") REFERENCES "TripStop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HotelSelection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripStopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stars" INTEGER,
    "pricePerNight" REAL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amenities" TEXT,
    "deepLinks" TEXT,
    "bestPriceSite" TEXT,
    CONSTRAINT "HotelSelection_tripStopId_fkey" FOREIGN KEY ("tripStopId") REFERENCES "TripStop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CostItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripStopId" TEXT,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    CONSTRAINT "CostItem_tripStopId_fkey" FOREIGN KEY ("tripStopId") REFERENCES "TripStop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripStopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "description" TEXT,
    "price" REAL,
    CONSTRAINT "Activity_tripStopId_fkey" FOREIGN KEY ("tripStopId") REFERENCES "TripStop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TripStop_tripId_idx" ON "TripStop"("tripId");

-- CreateIndex
CREATE INDEX "Spot_tripStopId_idx" ON "Spot"("tripStopId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelSelection_tripStopId_key" ON "HotelSelection"("tripStopId");

-- CreateIndex
CREATE INDEX "CostItem_tripStopId_idx" ON "CostItem"("tripStopId");

-- CreateIndex
CREATE INDEX "Activity_tripStopId_idx" ON "Activity"("tripStopId");
