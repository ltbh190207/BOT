// modules/command/nronoti.js
const { EmbedBuilder } = require('discord.js');

module.exports.config = {
    name: "nronoti",
    aliases: ["nronotify", "nroalert"],
    version: "2.0.0",
    hasPermission: 1, // Admin server
    credits: "GPT",
    description: "Quản lý thông báo tự động từ NRO Boss Tracker",
    commandCategory: "NRO",
    usages: "[on/off/server/type/interval/status]",
    cooldowns: 5,
};

module.exports.run = async function ({ client, message, args }) {
    // Gọi hàm handleCommand từ event nro_notify
    const nroNotifyEvent = global.events.get("nro_notify");

    if (!nroNotifyEvent || !nroNotifyEvent.handleCommand) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Lỗi')
            .setDescription('Module NRO Notify chưa được load. Vui lòng khởi động lại bot.')
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    await nroNotifyEvent.handleCommand(client, message, args);
};