// modules/event/nro_notify.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { EmbedBuilder } = require('discord.js');

const SETTINGS_PATH = path.join(__dirname, "../../data/nro_notify_settings.json");
const NOTIFIED_IDS_PATH = path.join(__dirname, "../../data/nro_notified_ids.json");
const API_BASE_URL = "http://localhost:8000"; // NRO Boss Tracker API

module.exports.config = {
    name: "nro_notify",
    eventType: ["messageCreate"],
    version: "2.0.0",
    credits: "GPT",
    description: "Tự động thông báo NRO Boss Tracker cho Discord"
};

// Hàm đọc/ghi file JSON
function readJSON(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 4));
        return defaultValue;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

// Icon theo category
const CATEGORY_ICONS = {
    'BOSS': '👹',
    'REWARD': '🎁',
    'CRYSTALLIZE': '💎',
    'UPGRADE': '⚡',
    'DIVINE_ITEM': '⚔️',
    'SYSTEM': '⚙️'
};

// Màu sắc cho embed theo category
const CATEGORY_COLORS = {
    'BOSS': '#FF0000',
    'REWARD': '#FFD700',
    'CRYSTALLIZE': '#00FFFF',
    'UPGRADE': '#FFA500',
    'DIVINE_ITEM': '#8B00FF',
    'SYSTEM': '#808080'
};

// Danh sách loại thông báo có thể chọn
const NOTIFICATION_TYPES = {
    'all': 'Tất cả',
    'boss': 'Boss xuất hiện/bị tiêu diệt',
    'boss_alive': 'Chỉ boss còn sống',
    'reward': 'Phần thưởng từ hộp quà',
    'crystallize': 'Pha lê hóa thành công',
    'upgrade': 'Nâng cấp thành công',
    'divine_item': 'Vật phẩm thần',
    'system': 'Thông báo hệ thống'
};

// Hàm format embed thông báo
function formatNotificationEmbed(item) {
    const icon = CATEGORY_ICONS[item.category] || '📢';
    const color = CATEGORY_COLORS[item.category] || '#5865F2';
    const time = moment(item.time, "YYYY-MM-DD HH:mm:ss").tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${icon} ${item.category}`)
        .setDescription(item.value)
        .addFields(
            { name: '🌟 Server', value: item.server, inline: true },
            { name: '⏰ Thời gian', value: time, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'NRO Boss Tracker' });

    // Thêm thông tin đặc biệt cho Boss
    if (item.category === 'BOSS') {
        const status = item.isKilled ? "❌ Đã bị tiêu diệt" : "✅ Đang còn sống";
        let statusText = status;
        if (item.killerName) {
            statusText += ` bởi ${item.killerName}`;
        }
        embed.addFields({ name: '📊 Trạng thái', value: statusText, inline: false });
    }

    // Thêm thông tin đặc biệt cho Divine Item
    if (item.category === 'DIVINE_ITEM' && item.equipmentName) {
        embed.addFields({ name: '⚔️ Vật phẩm', value: item.equipmentName, inline: false });
    }

    return embed;
}

// Hàm kiểm tra xem notification có nên được gửi không
function shouldNotify(item, notifyTypes) {
    if (notifyTypes.includes('all')) return true;

    const category = item.category;

    if (notifyTypes.includes('boss') && category === 'BOSS') return true;
    if (notifyTypes.includes('boss_alive') && category === 'BOSS' && !item.isKilled) return true;
    if (notifyTypes.includes('reward') && category === 'REWARD') return true;
    if (notifyTypes.includes('crystallize') && category === 'CRYSTALLIZE') return true;
    if (notifyTypes.includes('upgrade') && category === 'UPGRADE') return true;
    if (notifyTypes.includes('divine_item') && category === 'DIVINE_ITEM') return true;
    if (notifyTypes.includes('system') && category === 'SYSTEM') return true;

    return false;
}

// Hàm lấy thông báo mới từ API
async function fetchNewNotifications(server, lastId = 0) {
    try {
        const response = await axios.post(`${API_BASE_URL}/notifications/filter`, {
            server: server,
            limit: 20
        }, {
            timeout: 10000
        });

        if (response.data.success) {
            const newNotifications = response.data.data.filter(item => item.id > lastId);
            return newNotifications.sort((a, b) => a.id - b.id);
        }
        return [];
    } catch (error) {
        console.error("[NRO_NOTIFY] Lỗi khi lấy thông báo:", error.message);
        return [];
    }
}

// Hàm xử lý lệnh cấu hình (gọi từ command)
async function handleCommand(client, message, args) {
    const { guildId, channelId, author } = message;
    const action = args[0]?.toLowerCase();

    // Kiểm tra quyền
    const isBotAdmin = global.config.adminUID.includes(author.id);
    const isGuildAdmin = message.member?.permissions.has('Administrator');

    if (!isBotAdmin && !isGuildAdmin) {
        return message.reply("🚫 Chỉ Admin server hoặc Admin Bot mới có thể sử dụng lệnh này.");
    }

    const settings = readJSON(SETTINGS_PATH);
    const guildSettings = settings[guildId] || {};

    if (!settings[guildId]) {
        settings[guildId] = {
            enabled: false,
            server: "1 sao",
            notifyTypes: ['divine_item', 'reward'],
            interval: 30,
            channelId: channelId
        };
    }

    const prefix = (global.data.guildData.get(guildId) || {}).PREFIX || global.config.prefix;

    switch (action) {
        case "on": {
            settings[guildId].enabled = true;
            settings[guildId].channelId = channelId; // Lưu channel hiện tại
            writeJSON(SETTINGS_PATH, settings);

            // Khởi tạo lastId nếu chưa có
            const notifiedIds = readJSON(NOTIFIED_IDS_PATH);
            if (!notifiedIds[guildId]) {
                notifiedIds[guildId] = 0;
            }
            writeJSON(NOTIFIED_IDS_PATH, notifiedIds);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Đã bật thông báo NRO Boss Tracker!')
                .addFields(
                    { name: '🌟 Server', value: settings[guildId].server, inline: true },
                    { name: '📢 Kênh', value: `<#${channelId}>`, inline: true },
                    { name: '📋 Loại', value: settings[guildId].notifyTypes.map(t => NOTIFICATION_TYPES[t]).join(", "), inline: false },
                    { name: '⏱️ Kiểm tra', value: `Mỗi ${settings[guildId].interval} giây`, inline: true }
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        case "off": {
            settings[guildId].enabled = false;
            writeJSON(SETTINGS_PATH, settings);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚫 Đã tắt thông báo NRO Boss Tracker')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        case "server": {
            const serverName = args.slice(1).join(" ");
            if (!serverName) {
                try {
                    const response = await axios.get(`${API_BASE_URL}/servers`);
                    if (response.data.success) {
                        const servers = response.data.servers.slice(0, 20);

                        const embed = new EmbedBuilder()
                            .setColor(global.config.colors.info)
                            .setTitle('📋 Danh sách servers')
                            .setDescription(servers.map((s, i) => `${i + 1}. ${s}`).join('\n'))
                            .setFooter({ text: `Dùng: ${prefix}nronoti server [tên server]` })
                            .setTimestamp();

                        return message.reply({ embeds: [embed] });
                    }
                } catch (error) {
                    return message.reply("❌ Không thể lấy danh sách servers.");
                }
            }

            settings[guildId].server = serverName;
            writeJSON(SETTINGS_PATH, settings);

            // Reset lastId khi đổi server
            const notifiedIds = readJSON(NOTIFIED_IDS_PATH);
            notifiedIds[guildId] = 0;
            writeJSON(NOTIFIED_IDS_PATH, notifiedIds);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Đã đổi server')
                .setDescription(`Server mới: **${serverName}**`)
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        case "type": {
            const types = args.slice(1);
            if (types.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(global.config.colors.info)
                    .setTitle('📢 Các loại thông báo có thể chọn')
                    .setDescription(Object.entries(NOTIFICATION_TYPES).map(([key, value]) =>
                        `• **${key}**: ${value}`
                    ).join('\n'))
                    .addFields({
                        name: '✅ Đang chọn',
                        value: settings[guildId].notifyTypes.map(t => NOTIFICATION_TYPES[t]).join(", ")
                    })
                    .setFooter({ text: `Dùng: ${prefix}nronoti type [loại1] [loại2] ...` })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const validTypes = types.filter(t => NOTIFICATION_TYPES.hasOwnProperty(t));
            if (validTypes.length === 0) {
                return message.reply("❌ Không có loại thông báo hợp lệ nào.");
            }

            settings[guildId].notifyTypes = validTypes;
            writeJSON(SETTINGS_PATH, settings);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Đã cập nhật loại thông báo')
                .setDescription(validTypes.map(t => `• ${NOTIFICATION_TYPES[t]}`).join('\n'))
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        case "interval": {
            const interval = parseInt(args[1]);
            if (!interval || interval < 10) {
                return message.reply("❌ Thời gian kiểm tra phải >= 10 giây.");
            }

            settings[guildId].interval = interval;
            writeJSON(SETTINGS_PATH, settings);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Đã cập nhật thời gian kiểm tra')
                .setDescription(`Kiểm tra mỗi **${interval} giây**`)
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        case "status": {
            const status = settings[guildId];
            const embed = new EmbedBuilder()
                .setColor(status.enabled ? '#00FF00' : '#FF0000')
                .setTitle('📊 TRẠNG THÁI THÔNG BÁO NRO')
                .addFields(
                    { name: '🔔 Trạng thái', value: status.enabled ? "✅ Đang bật" : "🚫 Đang tắt", inline: true },
                    { name: '🌟 Server', value: status.server, inline: true },
                    { name: '📢 Kênh', value: status.channelId ? `<#${status.channelId}>` : "Chưa thiết lập", inline: true },
                    { name: '📋 Loại thông báo', value: status.notifyTypes.map(t => NOTIFICATION_TYPES[t]).join(", "), inline: false },
                    { name: '⏱️ Kiểm tra', value: `Mỗi ${status.interval} giây`, inline: true }
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        default: {
            const embed = new EmbedBuilder()
                .setColor(global.config.colors.primary)
                .setTitle('🤖 NRO AUTO NOTIFICATION')
                .setDescription(
                    `\`${prefix}nronoti on\` - Bật thông báo\n` +
                    `\`${prefix}nronoti off\` - Tắt thông báo\n` +
                    `\`${prefix}nronoti server [tên]\` - Đổi server\n` +
                    `\`${prefix}nronoti type [loại]\` - Chọn loại thông báo\n` +
                    `\`${prefix}nronoti interval [giây]\` - Đổi tần suất kiểm tra\n` +
                    `\`${prefix}nronoti status\` - Xem trạng thái`
                )
                .addFields({
                    name: '💡 Ví dụ',
                    value: `\`${prefix}nronoti server 1 sao\`\n\`${prefix}nronoti type boss_alive reward divine_item\``
                })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    }
}

// Export hàm handleCommand
module.exports.handleCommand = handleCommand;

// Interval checking
let checkInterval = null;

module.exports.onLoad = function ({ client }) {
    console.log("✅ [NRO_NOTIFY] Module đã được load!");

    if (checkInterval) {
        clearInterval(checkInterval);
    }

    checkInterval = setInterval(async () => {
        const settings = readJSON(SETTINGS_PATH);
        const notifiedIds = readJSON(NOTIFIED_IDS_PATH);

        for (const [guildId, config] of Object.entries(settings)) {
            if (!config.enabled || !config.channelId) continue;

            try {
                const channel = await client.channels.fetch(config.channelId).catch(() => null);
                if (!channel) {
                    console.error(`[NRO_NOTIFY] Không tìm thấy channel ${config.channelId} trong guild ${guildId}`);
                    continue;
                }

                const lastId = notifiedIds[guildId] || 0;
                const newNotifications = await fetchNewNotifications(config.server, lastId);

                if (newNotifications.length > 0) {
                    for (const item of newNotifications) {
                        if (shouldNotify(item, config.notifyTypes)) {
                            const embed = formatNotificationEmbed(item);
                            await channel.send({ embeds: [embed] });
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }

                        notifiedIds[guildId] = Math.max(notifiedIds[guildId] || 0, item.id);
                    }

                    writeJSON(NOTIFIED_IDS_PATH, notifiedIds);
                }
            } catch (error) {
                console.error(`[NRO_NOTIFY] Lỗi khi xử lý thông báo cho guild ${guildId}:`, error.message);
            }
        }
    }, 10000); // Kiểm tra mỗi 10 giây
};

module.exports.handleEvent = function () {
    // Event này để module hoạt động
};