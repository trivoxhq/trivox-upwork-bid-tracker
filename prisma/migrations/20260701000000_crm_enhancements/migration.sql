-- AlterTable
ALTER TABLE `users` ADD COLUMN `weeklyTarget` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `bids` ADD COLUMN `lostReason` VARCHAR(191) NULL,
    ADD COLUMN `dealId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `leads` ADD COLUMN `lostReason` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `clients` ADD COLUMN `isRecurring` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `deals` ADD COLUMN `lostReason` VARCHAR(191) NULL,
    ADD COLUMN `closedWonAt` DATETIME(3) NULL,
    ADD COLUMN `closedLostAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `crm_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `crm_audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `crm_audit_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `crm_audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bids_dealId_idx` ON `bids`(`dealId`);

-- CreateIndex
CREATE INDEX `clients_isRecurring_idx` ON `clients`(`isRecurring`);

-- CreateIndex
CREATE INDEX `deals_closedWonAt_idx` ON `deals`(`closedWonAt`);

-- CreateIndex
CREATE INDEX `deals_closedLostAt_idx` ON `deals`(`closedLostAt`);

-- AddForeignKey
ALTER TABLE `bids` ADD CONSTRAINT `bids_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `deals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_audit_logs` ADD CONSTRAINT `crm_audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
