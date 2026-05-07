-- CreateTable
CREATE TABLE `profiles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `profiles_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `niches` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `niches_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `profiles` (`id`, `name`, `isActive`, `createdAt`) VALUES
('a1111111-1111-4111-8111-111111111101', 'PK Female', true, CURRENT_TIMESTAMP(3)),
('a1111111-1111-4111-8111-111111111102', 'US Female', true, CURRENT_TIMESTAMP(3)),
('a1111111-1111-4111-8111-111111111103', 'US Male', true, CURRENT_TIMESTAMP(3));

INSERT INTO `niches` (`id`, `name`, `isActive`, `createdAt`) VALUES
('b1111111-1111-4111-8111-111111111101', 'Graphic Design', true, CURRENT_TIMESTAMP(3)),
('b1111111-1111-4111-8111-111111111102', 'AI Imaging', true, CURRENT_TIMESTAMP(3)),
('b1111111-1111-4111-8111-111111111103', 'Video Creation', true, CURRENT_TIMESTAMP(3)),
('b1111111-1111-4111-8111-111111111104', 'Illustration', true, CURRENT_TIMESTAMP(3)),
('b1111111-1111-4111-8111-111111111105', '3D', true, CURRENT_TIMESTAMP(3)),
('b1111111-1111-4111-8111-111111111106', 'Ebook / Layout', true, CURRENT_TIMESTAMP(3));

ALTER TABLE `bids` ADD COLUMN `profileIdNew` VARCHAR(191) NULL;
ALTER TABLE `bids` ADD COLUMN `nicheId` VARCHAR(191) NULL;

ALTER TABLE `bids` CHANGE `profileId` `profileLegacy` VARCHAR(191) NOT NULL;
ALTER TABLE `bids` CHANGE `niche` `nicheLegacy` VARCHAR(191) NOT NULL;

UPDATE `bids` AS b
INNER JOIN `profiles` AS p ON p.`name` = b.`profileLegacy`
SET b.`profileIdNew` = p.`id`;

UPDATE `bids` AS b
INNER JOIN `niches` AS n ON n.`name` = b.`nicheLegacy`
SET b.`nicheId` = n.`id`;

UPDATE `bids` SET `profileIdNew` = 'a1111111-1111-4111-8111-111111111101' WHERE `profileIdNew` IS NULL;
UPDATE `bids` SET `nicheId` = 'b1111111-1111-4111-8111-111111111101' WHERE `nicheId` IS NULL;

ALTER TABLE `bids` DROP COLUMN `profileLegacy`,
    DROP COLUMN `nicheLegacy`;

ALTER TABLE `bids` CHANGE `profileIdNew` `profileId` VARCHAR(191) NOT NULL;

ALTER TABLE `bids` ADD CONSTRAINT `bids_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `bids` ADD CONSTRAINT `bids_nicheId_fkey` FOREIGN KEY (`nicheId`) REFERENCES `niches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `bids_profileId_idx` ON `bids`(`profileId`);
CREATE INDEX `bids_nicheId_idx` ON `bids`(`nicheId`);
