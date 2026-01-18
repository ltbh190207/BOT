const chalk = require("chalk");
const logger = require("./logger");
// IMPORT handleReply
const handleReply = require("./handleReply");

module.exports = async ({ client, message }) => {
    if (!message.content || message.author.bot) return;

    // --- THÊM ĐOẠN NÀY ---
    // Gọi handleReply ngay lập tức để kiểm tra xem user có đang phản hồi bot không
    try {
        await handleReply({ client, message });
    } catch (e) {
        console.error(chalk.red("❌ Lỗi trong handleReply từ handleMessage:"), e);
    }
    // ---------------------

    const { guildId, author, content } = message;

    // Kiểm tra quyền admin (Đảm bảo global.config đã được load từ index.js)
    const adminUIDs = global.config?.adminUID || [];
    const isBotAdmin = adminUIDs.includes(author.id);
    const isGuildAdmin = message.member?.permissions.has('Administrator') || false;

    // Xác định prefix
    const guildPrefix = guildId && global.data?.guildData ? (global.data.guildData.get(guildId) || {}).PREFIX : null;
    const defaultPrefix = global.config?.prefix || "!";
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
        if (global.noprefix) {
            for (const command of global.noprefix.values()) {
                if (command.config.keywords.some(keyword => messageContent === keyword.toLowerCase())) {
                    const commandName = command.config.name;
                    logger({ client, message, commandName, type: 'NOPREFIX' });

                    try {
                        await command.run({ client, message });
                        return;
                    } catch (e) {
                        console.error(chalk.red(`❌ Lỗi noprefix ${commandName}:`), e);
                    }
                }
            }
        }
        // Nếu không có prefix và không phải noprefix command, dừng xử lý (để tránh spam log)
        return;
    }

    // Tách args và lấy tên lệnh
    const args = content.slice(usedPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Tìm lệnh trong global.commands
    const command = global.commands.get(commandName) || global.commands.get(global.aliases.get(commandName));

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

    if (!cooldowns.has(command.config.name)) {
        cooldowns.set(command.config.name, new Map());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.config.name);
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
    } catch (error) {
        console.error(chalk.red(`❌ Lỗi khi thực thi lệnh ${commandName}:`), error);
        message.reply('❌ Có lỗi xảy ra khi thực hiện lệnh này!');
    }
};