const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require('discord.js');

module.exports.config = {
    name: "setprefix",
    aliases: ["prefix"],
    version: "1.0.0",
    hasPermission: 1, // Chỉ admin server
    credits: "YourName",
    description: "Thay đổi prefix cho server",
    commandCategory: "Config",
    usages: "[prefix mới] hoặc [reset]",
    cooldowns: 5,
};

function savePrefixes(dataMap) {
    try {
        const prefixesPath = path.join(__dirname, "..", "..", "data", "prefixes.json");
        const dataToSave = Object.fromEntries(dataMap);
        fs.writeFileSync(prefixesPath, JSON.stringify(dataToSave, null, 4));
    } catch (error) {
        console.error("Lỗi khi lưu file prefix:", error);
    }
}

module.exports.run = async function ({ client, message, args }) {
    if (!message.guild) {
        return message.reply("❌ Lệnh này chỉ có thể sử dụng trong server!");
    }

    if (args.length === 0) {
        const currentPrefix = (global.data.guildData.get(message.guildId) || {}).PREFIX || global.config.prefix;

        const embed = new EmbedBuilder()
            .setColor(global.config.colors.info)
            .setTitle("⚙️ Prefix hiện tại")
            .setDescription(`Prefix của server này là: \`${currentPrefix}\``)
            .addFields({
                name: "💡 Cách thay đổi",
                value: `Sử dụng: \`${currentPrefix}setprefix [prefix mới]\`\nĐể reset: \`${currentPrefix}setprefix reset\``
            });

        return message.reply({ embeds: [embed] });
    }

    const newPrefix = args[0].trim();
    let dataMap = global.data.guildData;
    let guildSettings = dataMap.get(message.guildId) || {};

    const embed = new EmbedBuilder()
        .setColor(global.config.colors.success)
        .setTimestamp();

    if (newPrefix === "reset") {
        delete guildSettings.PREFIX;
        embed.setTitle("✅ Đã reset prefix")
            .setDescription(`Prefix đã được reset về mặc định: \`${global.config.prefix}\``);
    } else {
        if (newPrefix.length > 3) {
            return message.reply("❌ Prefix không được dài quá 3 ký tự!");
        }

        guildSettings.PREFIX = newPrefix;
        embed.setTitle("✅ Đã thay đổi prefix")
            .setDescription(`Prefix mới của server: \`${newPrefix}\``);
    }

    dataMap.set(message.guildId, guildSettings);
    savePrefixes(dataMap);

    message.reply({ embeds: [embed] });
};