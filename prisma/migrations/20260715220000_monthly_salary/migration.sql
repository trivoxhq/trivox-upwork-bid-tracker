-- AlterTable
ALTER TABLE `users` ADD COLUMN `monthlySalary` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `attendance_settings` ADD COLUMN `workingDaysPerMonth` INTEGER NOT NULL DEFAULT 22;

-- Backfill monthly salary from hourly rate assuming 22 days × 8h
UPDATE `users`
SET `monthlySalary` = `hourlyRate` * 22 * 8
WHERE `hourlyRate` > 0 AND `monthlySalary` = 0;
