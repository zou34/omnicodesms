-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- Même verrouillage que les autres tables (voir 20260917120000_lock_down_public_roles) :
-- les coordonnées des visiteurs ne doivent jamais être lisibles via l'API REST publique.
ALTER TABLE "ContactMessage" ENABLE ROW LEVEL SECURITY;
