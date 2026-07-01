-- Expand users.role enum with manager, sales_member, and viewer
ALTER TABLE `users` MODIFY `role` ENUM('admin', 'manager', 'sales_member', 'viewer', 'member') NOT NULL;
