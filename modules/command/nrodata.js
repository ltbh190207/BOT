// modules/command/nrodata.js
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

module.exports.config = {
    name: "nrodata",
    aliases: ["nroitem", "nrosearch"],
    version: "2.0.0",
    hasPermission: 0,
    credits: "GPT",
    description: "Tra cứu thông tin vật phẩm NRO",
    commandCategory: "NRO",
    usages: "[tên vật phẩm] [publisher]",
    cooldowns: 5,
};

const API_BASE = "http://localhost:8080";
const DEFAULT_SERVER = "Server1";

// Hàm tìm kiếm vật phẩm
function searchItem(items, keyword) {
    const lowerKeyword = keyword.toLowerCase().trim();

    const results = items.filter(item =>
        item.name.toLowerCase().includes(lowerKeyword)
    );

    results.sort((a, b) => {
        const aExact = a.name.toLowerCase() === lowerKeyword;
        const bExact = b.name.toLowerCase() === lowerKeyword;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        return a.id - b.id;
    });

    return results.slice(0, 10);
}

// Hàm tải ảnh từ API
async function downloadImage(publisher, iconId, itemId) {
    try {
        const imageUrl = `${API_BASE}/icons/${publisher}/${iconId}`;
        console.log(`[INFO] Đang tải ảnh từ: ${imageUrl}`);

        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            validateStatus: (status) => status === 200
        });

        const imagePath = path.join(__dirname, `../../cache/nro_item_${itemId}.png`);

        const cacheDir = path.join(__dirname, '../../cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        fs.writeFileSync(imagePath, response.data);
        console.log(`[SUCCESS] Đã lưu ảnh vào: ${imagePath}`);
        return imagePath;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error(`[WARN] Không tìm thấy ảnh icon ${iconId} cho publisher ${publisher}`);
        } else {
            console.error(`[ERROR] Lỗi tải ảnh:`, error.message);
        }
        return null;
    }
}

// Hàm tạo embed thông tin vật phẩm
function createItemEmbed(item, publisher, server, imagePath = null) {
    const types = {
        0: "Trang bị",
        1: "Vật phẩm sử dụng",
        2: "Trang sức",
        5: "Ngọc rồng",
        6: "Thú cưỡi",
        7: "Đậu thần"
    };

    const genders = {
        0: "🌍 Trái Đất",
        1: "🟢 Namek",
        2: "⭐ Xayda",
        3: "🌐 Mọi hành tinh"
    };

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`📦 ${item.name}`)
        .addFields(
            { name: '🆔 ID', value: `${item.id}`, inline: true },
            { name: '⭐ Loại', value: types[item.type] || `${item.type}`, inline: true }
        );

    if (item.gender !== undefined) {
        embed.addFields({
            name: '👤 Hành tinh',
            value: genders[item.gender] || `${item.gender}`,
            inline: true
        });
    }

    if (item.level) {
        embed.addFields({ name: '🎯 Cấp độ', value: `${item.level}`, inline: true });
    }

    if (item.strRequire) {
        embed.addFields({
            name: '💪 Yêu cầu sức mạnh',
            value: item.strRequire.toLocaleString(),
            inline: true
        });
    }

    if (item.description) {
        const desc = item.description.length > 1024
            ? item.description.substring(0, 1021) + "..."
            : item.description;
        embed.addFields({ name: '📝 Mô tả', value: desc, inline: false });
    }

    const iconId = item.iconID || item.icon || item.id;
    embed.addFields({ name: '🖼️ Icon ID', value: `${iconId}`, inline: true });

    embed.setFooter({ text: `Nguồn: ${publisher}/${server}` });
    embed.setTimestamp();

    if (imagePath) {
        embed.setThumbnail('attachment://item.png');
    }

    return embed;
}

module.exports.run = async function ({ client, message, args }) {
    if (args.length === 0) {
        const prefix = (global.data.guildData.get(message.guildId) || {}).PREFIX || global.config.prefix;

        const embed = new EmbedBuilder()
            .setColor(global.config.colors.warning)
            .setTitle('⚠️ Cách sử dụng')
            .setDescription('Vui lòng nhập tên vật phẩm!')
            .addFields(
                {
                    name: '📖 Cú pháp',
                    value: `\`${prefix}nrodata [tên vật phẩm] [publisher]\``,
                    inline: false
                },
                {
                    name: '📌 Ví dụ',
                    value: `\`${prefix}nrodata áo\`\n\`${prefix}nrodata găng tay TeaMobi\`\n\`${prefix}nrodata rada HSNR\``,
                    inline: false
                },
                {
                    name: '🏢 Publishers',
                    value: '• TeaMobi (mặc định)\n• HSNR\n• BlueFake\n• ILoveNRO',
                    inline: false
                }
            )
            .setFooter({ text: 'Server: Luôn lấy Server1' });

        return message.reply({ embeds: [embed] });
    }

    // Parse arguments
    let keyword, publisher;
    const validPublishers = ["TeaMobi", "HSNR", "BlueFake", "ILoveNRO"];
    const publisherArg = args.find(arg =>
        validPublishers.some(p => p.toLowerCase() === arg.toLowerCase())
    );

    if (publisherArg) {
        publisher = validPublishers.find(p => p.toLowerCase() === publisherArg.toLowerCase());
        keyword = args.filter(arg => arg.toLowerCase() !== publisherArg.toLowerCase()).join(" ");
    } else {
        publisher = "TeaMobi";
        keyword = args.join(" ");
    }

    const server = DEFAULT_SERVER;

    try {
        const waitEmbed = new EmbedBuilder()
            .setColor(global.config.colors.info)
            .setDescription(`🔍 Đang tìm kiếm "${keyword}" trên ${publisher}/${server}...`);

        const waitMsg = await message.reply({ embeds: [waitEmbed] });

        // Lấy dữ liệu từ API
        const response = await axios.get(`${API_BASE}/items/${publisher}/${server}`, {
            timeout: 15000
        });

        if (!response.data || !Array.isArray(response.data)) {
            throw new Error("Dữ liệu không hợp lệ từ API");
        }

        const items = response.data;
        const results = searchItem(items, keyword);

        await waitMsg.delete().catch(() => { });

        if (results.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(global.config.colors.error)
                .setTitle('❌ Không tìm thấy')
                .setDescription(`Không tìm thấy vật phẩm nào với từ khóa "${keyword}"`)
                .setFooter({ text: `Nguồn: ${publisher}/${server}` });

            return message.reply({ embeds: [embed] });
        }

        // Nếu tìm thấy 1 kết quả duy nhất
        if (results.length === 1) {
            const item = results[0];
            const iconId = item.iconID || item.icon || item.id;
            const imagePath = await downloadImage(publisher, iconId, item.id);

            const embed = createItemEmbed(item, publisher, server, imagePath);

            const messageOptions = { embeds: [embed] };

            if (imagePath && fs.existsSync(imagePath)) {
                const attachment = new AttachmentBuilder(imagePath, { name: 'item.png' });
                messageOptions.files = [attachment];
            } else {
                embed.addFields({
                    name: '⚠️ Thông báo',
                    value: `Không thể tải ảnh vật phẩm (Icon ID: ${iconId})`,
                    inline: false
                });
            }

            await message.reply(messageOptions);

            // Xóa file tạm
            if (imagePath && fs.existsSync(imagePath)) {
                setTimeout(() => {
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (e) {
                        console.error(`[ERROR] Không thể xóa file tạm: ${e.message}`);
                    }
                }, 1000);
            }

            return;
        }

        // Nếu tìm thấy nhiều kết quả
        const genders = { 0: "🌍", 1: "🟢", 2: "⭐", 3: "🌐" };
        const description = results.map((item, index) => {
            const genderIcon = genders[item.gender] || "";
            return `${index + 1}. ${genderIcon} ${item.name} (ID: ${item.id})`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(global.config.colors.primary)
            .setTitle(`🔎 Tìm thấy ${results.length} kết quả`)
            .setDescription(description)
            .addFields({
                name: '📌 Hướng dẫn',
                value: 'Reply tin nhắn này với số thứ tự để xem chi tiết',
                inline: false
            })
            .setFooter({ text: `Nguồn: ${publisher}/${server}` })
            .setTimestamp();

        const sentMsg = await message.reply({ embeds: [embed] });

        global.client.handleReply.push({
            name: this.config.name,
            messageID: sentMsg.id,
            author: message.author.id,
            results: results,
            publisher: publisher,
            server: server
        });

    } catch (error) {
        console.error("[NRODATA] Lỗi:", error);

        const embed = new EmbedBuilder()
            .setColor(global.config.colors.error)
            .setTitle('❌ Đã có lỗi xảy ra');

        if (error.code === "ECONNREFUSED") {
            embed.setDescription(
                '⚠️ Không thể kết nối đến API.\n' +
                '📌 Đảm bảo API đang chạy: `python apidata.py`\n' +
                '📌 Kiểm tra port: http://localhost:8080'
            );
        } else if (error.response) {
            embed.setDescription(`⚠️ API trả về lỗi: ${error.response.status}`);
            if (error.response.data?.detail) {
                embed.addFields({ name: 'Chi tiết', value: error.response.data.detail });
            }
        } else {
            embed.setDescription(`⚠️ ${error.message}`);
        }

        return message.reply({ embeds: [embed] });
    }
};

// Xử lý reply
module.exports.handleReply = async function ({ client, message, handleReply }) {
    if (message.author.id !== handleReply.author) {
        return message.reply("⚠️ Chỉ người gọi lệnh mới có thể chọn!");
    }

    const choice = parseInt(message.content);

    if (isNaN(choice) || choice < 1 || choice > handleReply.results.length) {
        return message.reply(`⚠️ Vui lòng nhập số từ 1 đến ${handleReply.results.length}`);
    }

    const item = handleReply.results[choice - 1];
    const iconId = item.iconID || item.icon || item.id;

    try {
        const waitEmbed = new EmbedBuilder()
            .setColor(global.config.colors.info)
            .setDescription("⏳ Đang tải thông tin...");

        const waitMsg = await message.reply({ embeds: [waitEmbed] });

        const imagePath = await downloadImage(handleReply.publisher, iconId, item.id);

        await waitMsg.delete().catch(() => { });

        const embed = createItemEmbed(item, handleReply.publisher, handleReply.server, imagePath);

        const messageOptions = { embeds: [embed] };

        if (imagePath && fs.existsSync(imagePath)) {
            const attachment = new AttachmentBuilder(imagePath, { name: 'item.png' });
            messageOptions.files = [attachment];
        } else {
            embed.addFields({
                name: '⚠️ Thông báo',
                value: `Không thể tải ảnh vật phẩm (Icon ID: ${iconId})`,
                inline: false
            });
        }

        await message.reply(messageOptions);

        // Xóa file tạm
        if (imagePath && fs.existsSync(imagePath)) {
            setTimeout(() => {
                try {
                    fs.unlinkSync(imagePath);
                } catch (e) {
                    console.error(`[ERROR] Không thể xóa file tạm: ${e.message}`);
                }
            }, 1000);
        }

        // Xóa handleReply
        const index = global.client.handleReply.findIndex(
            h => h.messageID === handleReply.messageID
        );
        if (index !== -1) {
            global.client.handleReply.splice(index, 1);
        }

        // Xóa tin nhắn danh sách
        const originalMsg = await message.channel.messages.fetch(handleReply.messageID).catch(() => null);
        if (originalMsg) {
            await originalMsg.delete().catch(() => { });
        }

    } catch (error) {
        console.error("[NRODATA] Lỗi khi xử lý reply:", error);
        message.reply("❌ Có lỗi khi tải thông tin vật phẩm!");
    }
};