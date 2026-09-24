-- ============================================================================
-- Plataforma de Gestão Financeira Pessoal — DDL completo (Neon / PostgreSQL)
-- ============================================================================
-- Gerado a partir de backend/prisma/schema.prisma.
--
-- IMPORTANTE: este arquivo é uma REFERÊNCIA/ALTERNATIVA MANUAL. O caminho
-- recomendado é deixar o Prisma Migrate gerar e aplicar isso automaticamente
-- (ver README, seção "Como aplicar no Neon"). Use este .sql apenas se quiser
-- rodar direto no SQL Editor do Neon sem passar pelo Prisma CLI.
--
-- Se você criar as tabelas por este arquivo, ainda assim rode
-- `npx prisma generate` no backend antes de usar (o Prisma Client precisa
-- ser gerado a partir do schema.prisma independente de como o banco foi
-- criado).
-- ============================================================================

-- Necessário para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
CREATE TYPE "IncomeSource" AS ENUM ('SALARY', 'FREELANCE', 'INVESTMENT_INCOME', 'GIFT', 'OTHER');
CREATE TYPE "ExpenseCategory" AS ENUM ('HOUSING', 'FOOD', 'TRANSPORT', 'HEALTH', 'EDUCATION', 'LEISURE', 'SUBSCRIPTIONS', 'TAXES', 'OTHER');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD');
CREATE TYPE "InvestmentType" AS ENUM ('STOCK', 'ETF', 'REIT', 'FIXED_INCOME', 'FUND', 'CRYPTO', 'OTHER');

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "email_verified" BOOLEAN NOT NULL DEFAULT false,
  "email_verified_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- AUTH (refresh tokens, verificação de e-mail, redefinição de senha)
-- ----------------------------------------------------------------------------
CREATE TABLE "refresh_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "user_agent" TEXT,
  "ip" TEXT,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

CREATE TABLE "email_verification_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "password_reset_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- INCOMES (Renda)
-- ----------------------------------------------------------------------------
CREATE TABLE "incomes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "description" TEXT NOT NULL,
  "amount" NUMERIC(18,2) NOT NULL,
  "source" "IncomeSource" NOT NULL DEFAULT 'OTHER',
  "date" DATE NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "incomes_user_id_date_idx" ON "incomes"("user_id", "date");

-- ----------------------------------------------------------------------------
-- CREDIT_CARDS (Cartões) — criada antes de expenses por causa da FK
-- ----------------------------------------------------------------------------
CREATE TABLE "credit_cards" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "limit_amount" NUMERIC(18,2) NOT NULL,
  "closing_day" INTEGER NOT NULL,
  "due_day" INTEGER NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "credit_cards_user_id_idx" ON "credit_cards"("user_id");

-- ----------------------------------------------------------------------------
-- EXPENSES (Gastos, incluindo compras parceladas no cartão)
-- ----------------------------------------------------------------------------
CREATE TABLE "expenses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "description" TEXT NOT NULL,
  "amount" NUMERIC(18,2) NOT NULL,
  "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
  "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "date" DATE NOT NULL,
  "credit_card_id" UUID REFERENCES "credit_cards"("id") ON DELETE SET NULL,
  "installment_number" INTEGER,
  "installment_count" INTEGER,
  "installment_group_id" TEXT,
  "invoice_month" INTEGER,
  "invoice_year" INTEGER,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "expenses_user_id_date_idx" ON "expenses"("user_id", "date");
CREATE INDEX "expenses_credit_card_id_invoice_year_invoice_month_idx" ON "expenses"("credit_card_id", "invoice_year", "invoice_month");

-- ----------------------------------------------------------------------------
-- INVESTMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE "investments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "InvestmentType" NOT NULL,
  "name" TEXT NOT NULL,
  "institution" TEXT,
  "invested_amount" NUMERIC(18,2) NOT NULL,
  "current_value" NUMERIC(18,2) NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "investments_user_id_idx" ON "investments"("user_id");

-- ----------------------------------------------------------------------------
-- NET_WORTH_SNAPSHOTS (Patrimônio — sempre gerado pelo backend)
-- ----------------------------------------------------------------------------
CREATE TABLE "net_worth_snapshots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "total_income" NUMERIC(18,2) NOT NULL,
  "total_expenses" NUMERIC(18,2) NOT NULL,
  "total_investments" NUMERIC(18,2) NOT NULL,
  "net_worth" NUMERIC(18,2) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "net_worth_snapshots_user_id_date_key" UNIQUE ("user_id", "date")
);
CREATE INDEX "net_worth_snapshots_user_id_date_idx" ON "net_worth_snapshots"("user_id", "date");
