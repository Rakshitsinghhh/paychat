-- CreateTable
CREATE TABLE "message" (
    "id" SERIAL NOT NULL,
    "senderId" TEXT NOT NULL,
    "recieverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);
