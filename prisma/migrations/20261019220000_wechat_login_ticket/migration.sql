-- AlterTable
CREATE UNIQUE INDEX `account_providerId_accountId_key` ON `account`(`providerId`, `accountId`);

-- CreateTable
CREATE TABLE `wechat_login_ticket` (
    `id` VARCHAR(191) NOT NULL,
    `nonceHash` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wechat_login_ticket_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
