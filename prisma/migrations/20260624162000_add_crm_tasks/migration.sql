-- CreateTable
CREATE TABLE `crm_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Open',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'Medium',
    `dueAt` DATETIME(3) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `crm_tasks_assignedToId_idx`(`assignedToId`),
    INDEX `crm_tasks_createdById_idx`(`createdById`),
    INDEX `crm_tasks_status_idx`(`status`),
    INDEX `crm_tasks_priority_idx`(`priority`),
    INDEX `crm_tasks_dueAt_idx`(`dueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_tasks` ADD CONSTRAINT `crm_tasks_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
