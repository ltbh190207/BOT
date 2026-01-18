const { EmbedBuilder } = require('discord.js');

module.exports.config = {
    name: "ping",
    aliases: ["latency"],
    version: "1.0.0",
    hasPermission: 0,
    credits: "YourName",
    description: "Kiểm tra độ trễ của bot",
    commandCategory: "Utility",
    usages: "",
    cooldowns: 5,
};

module.exports.run = async function ({ client, message }) {
    const sent = await message.reply("🏓 Pinging...");

    const botLatency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    const embed = new EmbedBuilder()
        .setColor(global.config.colors.success)
        .setTitle("🏓 Pong!")
        .addFields(
            { name: '📡 Bot Latency', value: `${botLatency}ms`, inline: true },
            { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true }
        )
        .setTimestamp();

    sent.edit({ content: null, embeds: [embed] });
};