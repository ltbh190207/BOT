const { EmbedBuilder } = require('discord.js');
const moment = require("moment-timezone");

module.exports.config = {
    name: "prefix",
    version: "1.0.0",
    credits: "YourName",
    description: "Lệnh noprefix để xem prefix",
    keywords: ["prefix", "dấu lệnh", "prefix là gì"]
};

module.exports.run = function ({ client, message }) {
    const defaultPrefix = global.config.prefix;
    const guildPrefix = message.guild
        ? (global.data.guildData.get(message.guildId) || {}).PREFIX || "Chưa được cài đặt"
        : "N/A";
    const currentTime = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

    const embed = new EmbedBuilder()
        .setColor(global.config.colors.info)
        .setTitle('⚙️ Thông tin Prefix')
        .addFields(
            { name: '🌐 Prefix mặc định', value: `\`${defaultPrefix}\``, inline: true },
            { name: '🏠 Prefix server', value: `\`${guildPrefix}\``, inline: true },
            { name: '⏰ Thời gian', value: currentTime, inline: false }
        )
        .setFooter({ text: `Sử dụng ${defaultPrefix}setprefix để thay đổi` })
        .setTimestamp();

    message.reply({ embeds: [embed] });
};