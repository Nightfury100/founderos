-- AlterTable
ALTER TABLE "GrantDetail" ALTER COLUMN "amountCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "InvestorDetail" ALTER COLUMN "checkSizeMinCents" SET DATA TYPE BIGINT,
ALTER COLUMN "checkSizeMaxCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "InvestorSearchProfile" ALTER COLUMN "checkSizeMinCents" SET DATA TYPE BIGINT,
ALTER COLUMN "checkSizeMaxCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "JobSearchProfile" ALTER COLUMN "salaryMinCents" SET DATA TYPE BIGINT,
ALTER COLUMN "salaryMaxCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "dealValueCents" SET DATA TYPE BIGINT;
