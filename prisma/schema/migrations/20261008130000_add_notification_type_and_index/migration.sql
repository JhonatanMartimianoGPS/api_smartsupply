-- AlterTable
ALTER TABLE "app_notifications" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'info';

-- CreateIndex
CREATE INDEX "app_notifications_user_id_created_at_idx" ON "app_notifications"("user_id", "created_at");

