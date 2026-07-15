-- AlterTable
ALTER TABLE `users` ADD COLUMN `hourlyRate` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Karachi';

-- CreateTable
CREATE TABLE `attendance_settings` (
    `id` VARCHAR(191) NOT NULL,
    `shiftTotalMinutes` INTEGER NOT NULL DEFAULT 540,
    `breakAllowanceMinutes` INTEGER NOT NULL DEFAULT 60,
    `minFullDayWorkingMinutes` INTEGER NOT NULL DEFAULT 480,
    `minHalfDayWorkingMinutes` INTEGER NOT NULL DEFAULT 300,
    `activityTrackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `workDate` DATE NOT NULL,
    `checkInAt` DATETIME(3) NOT NULL,
    `checkOutAt` DATETIME(3) NULL,
    `breakMinutes` INTEGER NOT NULL DEFAULT 0,
    `workingMinutes` INTEGER NULL,
    `salaryAmount` INTEGER NULL,
    `dailySummary` TEXT NULL,
    `dayType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `checkInIp` VARCHAR(191) NOT NULL,
    `checkInUserAgent` TEXT NOT NULL,
    `checkInDeviceId` VARCHAR(191) NULL,
    `checkOutIp` VARCHAR(191) NULL,
    `checkOutUserAgent` TEXT NULL,
    `checkOutDeviceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `attendance_records_userId_checkInAt_idx`(`userId`, `checkInAt`),
    INDEX `attendance_records_status_idx`(`status`),
    INDEX `attendance_records_workDate_idx`(`workDate`),
    UNIQUE INDEX `attendance_records_userId_workDate_key`(`userId`, `workDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_breaks` (
    `id` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NULL,

    INDEX `attendance_breaks_recordId_idx`(`recordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_event_logs` (
    `id` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` TEXT NOT NULL,
    `deviceFingerprint` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_event_logs_recordId_createdAt_idx`(`recordId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_activity_captures` (
    `id` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `storedName` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `sizeBytes` INTEGER NULL,
    `metaJson` TEXT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` TEXT NULL,
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_activity_captures_recordId_capturedAt_idx`(`recordId`, `capturedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendance_settings` ADD CONSTRAINT `attendance_settings_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_breaks` ADD CONSTRAINT `attendance_breaks_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `attendance_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_event_logs` ADD CONSTRAINT `attendance_event_logs_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `attendance_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_activity_captures` ADD CONSTRAINT `attendance_activity_captures_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `attendance_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default settings row
INSERT INTO `attendance_settings` (`id`, `shiftTotalMinutes`, `breakAllowanceMinutes`, `minFullDayWorkingMinutes`, `minHalfDayWorkingMinutes`, `activityTrackingEnabled`, `updatedAt`)
VALUES ('default', 540, 60, 480, 300, false, CURRENT_TIMESTAMP(3));
