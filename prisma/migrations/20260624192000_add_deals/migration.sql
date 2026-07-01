-- CreateTable
CREATE TABLE `deals` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,
    `stage` VARCHAR(191) NOT NULL DEFAULT 'Qualification',
    `probability` INTEGER NOT NULL DEFAULT 0,
    `expectedCloseAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `deals_ownerId_idx`(`ownerId`),
    INDEX `deals_createdById_idx`(`createdById`),
    INDEX `deals_stage_idx`(`stage`),
    INDEX `deals_expectedCloseAt_idx`(`expectedCloseAt`),
    INDEX `deals_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `deals` ADD CONSTRAINT `deals_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deals` ADD CONSTRAINT `deals_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
