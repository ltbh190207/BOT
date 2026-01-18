const chalk = require("chalk");
const logger = require("./logger");

module.exports = async ({ client, message }) => {
    if (!message.content || message.author.bot) return;

    const { guildId, author, content } = message;

    // Kiểm tra quyền admin
    const isBotAdmin = global.config.adminUID.includes(author.id);
    const isGuildAdmin = message.member?.permissions.has('Administrator') || false;

    // Xác định prefix
    const guildPrefix = guildId ? (global.data.guildData.get(guildId) || {}).PREFIX : null;
    const defaultPrefix = global.config.prefix;
    let usedPrefix = null;

    const effectivePrefix = guildPrefix || defaultPrefix;

    if (content.startsWith(effectivePrefix)) {
        usedPrefix = effectivePrefix;
    } else if (isBotAdmin && content.startsWith(defaultPrefix)) {
        usedPrefix = defaultPrefix;
    }

    // Kiểm tra noprefix commands
    if (!usedPrefix) {
        const messageContent = content.toLowerCase().trim();
        for (const command of global.noprefix.values()) {
            if (command.config.keywords.some(keyword => messageContent === keyword.toLowerCase())) {
                const commandName = command.config.name;
                logger({ client, message, commandName, type: 'NOPREFIX' });

                try {
                    await command.run({ client, message });
                    return;
                } catch (e) {
                    console.error(chalk.red(`❌ Lỗi khi chạy noprefix "${commandName}":`), e);
                }
            }
        }
        return;
    }

    // Parse command
    const args = content.slice(usedPrefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = global.commands.get(commandName);
    if (!command) return;

    // Kiểm tra quyền hạn
    if (command.config.hasPermission === 1 && !isGuildAdmin && !isBotAdmin) {
        return message.reply("🚫 Lệnh này chỉ dành cho Quản trị viên server.");
    }
    if (command.config.hasPermission === 2 && !isBotAdmin) {
        return message.reply("🚫 Lệnh này chỉ dành cho chủ bot.");
    }

    // Cooldown check
    if (!global.client.cooldowns) global.client.cooldowns = new Map();
    const cooldowns = global.client.cooldowns;

    if (!cooldowns.has(commandName)) {
        cooldowns.set(commandName, new Map());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(commandName);
    const cooldownAmount = (command.config.cooldowns || 3) * 1000;

    if (timestamps.has(author.id)) {
        const expirationTime = timestamps.get(author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`⏱️ Vui lòng đợi ${timeLeft.toFixed(1)} giây trước khi sử dụng lệnh \`${commandName}\` lại.`);
        }
    }

    timestamps.set(author.id, now);
    setTimeout(() => timestamps.delete(author.id), cooldownAmount);

    // Log và execute
    logger({ client, message, commandName, type: 'COMMAND' });

    try {
        await command.run({ client, message, args });
    } catch (e) {
        console.error(chalk.red(`❌ Lỗi khi chạy lệnh "${commandName}":`), e);
        message.reply(`⚠️ Đã có lỗi xảy ra khi thực thi lệnh "${commandName}".`);
    }
};