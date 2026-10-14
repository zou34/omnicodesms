-- CreateTable
CREATE TABLE "EmailCampaignSend" (
    "id" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaignSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailCampaignSend_campaign_userId_key" ON "EmailCampaignSend"("campaign", "userId");

-- AddForeignKey
ALTER TABLE "EmailCampaignSend" ADD CONSTRAINT "EmailCampaignSend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Même verrouillage que les autres tables (voir 20260917120000_lock_down_public_roles) :
-- qui a reçu quelle campagne ne doit jamais être lisible via l'API REST publique.
ALTER TABLE "EmailCampaignSend" ENABLE ROW LEVEL SECURITY;
