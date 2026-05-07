-- CreateTable
CREATE TABLE `bids` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `client` VARCHAR(191) NOT NULL,
    `bidLink` VARCHAR(191) NULL,
    `niche` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'New',
    `value` INTEGER NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `addedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bids_addedById_idx`(`addedById`),
    INDEX `bids_date_idx`(`date`),
    INDEX `bids_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bids` ADD CONSTRAINT `bids_addedById_fkey` FOREIGN KEY (`addedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
