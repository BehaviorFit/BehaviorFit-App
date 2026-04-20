-- CreateTable
CREATE TABLE "AppleHealthEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "steps" INTEGER,
    "activeCalories" REAL,
    "exerciseMinutes" INTEGER,
    "standHours" INTEGER,
    "restingHeartRate" REAL,
    "avgHeartRate" REAL,
    "flightsClimbed" INTEGER,
    "distanceMiles" REAL,
    "sleepHours" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Apple Health Shortcut',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AppleHealthEntry_date_key" ON "AppleHealthEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_token_key" ON "ApiToken"("token");
