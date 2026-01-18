const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BANNED_GUILDS_PATH = path.join(__dirname, "../../data/banned_guilds.json");

module.exports.config = {
    name: "admin",
    aliases: ["adm"],
    version: "1.0.0",
    hasPermission: 2, // Chỉ admin bot
    credits: "YourName",
    description: "Công cụ quản lý dành cho admin bot",
    commandCategory: "Admin",
    usages: "[stats/ban/unban/announce]",
    cooldowns: 5,
};

function readJSON(filePath, defaultValue = []) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 4));
        return defaultValue;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

module.exports.run = async function ({ client, message, args }) {
    const action = args[0]?.toLowerCase();

    const embed = new EmbedBuilder()
        .setColor(global.config.colors.primary)
        .setTimestamp();

    switch (action) {
        case "stats": {
            const totalGuilds = client.guilds.cache.size;
            const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const totalCommands = global.commands.size;

            embed.setTitle("📊 Thống kê Bot")
                .addFields(
                    { name: '🏠 Servers', value: `${totalGuilds}`, inline: true },
                    { name: '👥 Users', value: `${totalUsers}`, inline: true },
                    { name: '⚡ Commands', value: `${totalCommands}`, inline: true },
                    { name: '💻 Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                    { name: '⏰ Uptime', value: formatUptime(process.uptime()), inline: true },
                    { name: '🏓 Ping', value: `${client.ws.ping}ms`, inline: true }
                );

            return message.reply({ embeds: [embed] });
        }

        case "ban": {
            if (!message.guild) {
                return message.reply("❌ Lệnh này chỉ có thể sử dụng trong server!");
            }

            const bannedGuilds = readJSON(BANNED_GUILDS_PATH);
            if (!bannedGuilds.includes(message.guildId)) {
                bannedGuilds.push(message.guildId);
                writeJSON(BANNED_GUILDS_PATH, bannedGuilds);
            }

            await message.reply("✅ Server này đã bị cấm. Bot sẽ rời ngay bây giờ.");
            return message.guild.leave();
        }

        case "unban": {
            const guildId = args[1];
            if (!guildId) {
                return message.reply("❌ Vui lòng nhập ID của server cần gỡ cấm!");
            }

            let bannedGuilds = readJSON(BANNED_GUILDS_PATH);
            if (bannedGuilds.includes(guildId)) {
                bannedGuilds = bannedGuilds.filter(id => id !== guildId);
                writeJSON(BANNED_GUILDS_PATH, bannedGuilds);

                embed.setTitle("✅ Đã gỡ cấm")
                    .setDescription(`Server ID: ${guildId} đã được gỡ cấm`);
            } else {
                embed.setTitle("❌ Lỗi")
                    .setDescription(`Server ID: ${guildId} không có trong danh sách cấm`);
            }

            return message.reply({ embeds: [embed] });
        }

        case "announce": {
            const announcement = args.slice(1).join(" ");
            if (!announcement) {
                return message.reply("❌ Vui lòng nhập nội dung thông báo!");
            }

            const announceEmbed = new EmbedBuilder()
                .setColor(global.config.colors.warning)
                .setTitle("📢 THÔNG BÁO TỪ ADMIN")
                .setDescription(announcement)
                .setFooter({ text: `Từ: ${message.author.username}` })
                .setTimestamp();

            let successCount = 0;
            let failCount = 0;

            for (const guild of client.guilds.cache.values()) {
                try {
                    const channel = guild.channels.cache.find(
                        ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages')
                    );

                    if (channel) {
                        await channel.send({ embeds: [announceEmbed] });
                        successCount++;
                    } else {
                        failCount++;
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (e) {
                    failCount++;
                }
            }

            embed.setTitle("✅ Thông báo hoàn tất")
                .addFields(
                    { name: '✅ Thành công', value: `${successCount}`, inline: true },
                    { name: '❌ Thất bại', value: `${failCount}`, inline: true }
                );

            return message.reply({ embeds: [embed] });
        }

        default: {
            const prefix = (global.data.guildData.get(message.guildId) || {}).PREFIX || global.config.prefix;
            embed.setTitle("🛠️ Admin Toolkit")
                .setDescription(
                    `\`${prefix}admin stats\` - Xem thống kê bot\n` +
                    `\`${prefix}admin ban\` - Cấm server hiện tại\n` +
                    `\`${prefix}admin unban [ID]\` - Gỡ cấm server\n` +
                    `\`${prefix}admin announce [text]\` - Gửi thông báo đến tất cả servers`
                );

            return message.reply({ embeds: [embed] });
        }
    }
};

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}