/*
  Warnings:

  - A unique constraint covering the columns `[provider,providerRef]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Transaction_provider_providerRef_key" ON "Transaction"("provider", "providerRef");
