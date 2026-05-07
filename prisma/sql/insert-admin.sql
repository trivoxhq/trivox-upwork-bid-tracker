-- Insert first admin (matches Prisma `User` model / `users` table).
-- Password: admin123  (bcrypt, 12 rounds — same cost as `prisma/seed.ts`)
--
-- Prerequisite: the `users` table must exist. From the project root run:
--   npx prisma migrate deploy
--   (or `npx prisma db push` in dev). Then run this script.
--
-- Run against your database, e.g.:
--   mysql -u root -p upwork_bid_tracker < prisma/sql/insert-admin.sql
--
-- If `js@trivoxhq.com` already exists, either skip this file or uncomment the DELETE below (dev only).

-- DELETE FROM `users` WHERE `email` = 'js@trivoxhq.com';

INSERT INTO `users` (
  `id`,
  `email`,
  `name`,
  `role`,
  `password`,
  `dailyTarget`,
  `monthlyTarget`,
  `isActive`,
  `createdAt`
) VALUES (
  '347b5057-967f-41ed-b5dd-9ead4fa150a1',
  'js@trivoxhq.com',
  'Admin',
  'admin',
  '$2b$12$aP/nfcFrgeyI1l6FwXKpx.2Tp1yigu9N0dnSAFwJa8xHg9ouhjoLy',
  0,
  0,
  1,
  CURRENT_TIMESTAMP(3)
);
