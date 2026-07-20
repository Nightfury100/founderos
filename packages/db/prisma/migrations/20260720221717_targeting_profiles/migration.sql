-- CreateTable
CREATE TABLE "JobSearchProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roleTitles" TEXT[],
    "seniority" TEXT[],
    "industries" TEXT[],
    "locations" TEXT[],
    "remoteOk" BOOLEAN NOT NULL DEFAULT true,
    "relocationOk" BOOLEAN NOT NULL DEFAULT false,
    "excludedCompanies" TEXT[],
    "salaryMinCents" INTEGER,
    "salaryMaxCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSearchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorSearchProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "investorTypes" "InvestorType"[],
    "stageFocus" TEXT[],
    "sectorFocus" TEXT[],
    "geographies" TEXT[],
    "checkSizeMinCents" INTEGER,
    "checkSizeMaxCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorSearchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobSearchProfile_workspaceId_key" ON "JobSearchProfile"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorSearchProfile_workspaceId_key" ON "InvestorSearchProfile"("workspaceId");

-- AddForeignKey
ALTER TABLE "JobSearchProfile" ADD CONSTRAINT "JobSearchProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorSearchProfile" ADD CONSTRAINT "InvestorSearchProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
