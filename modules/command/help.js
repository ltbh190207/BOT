const { EmbedBuilder } = require('discord.js');

module.exports.config = {
    name: "help",
    aliases: ["h", "commands"],
    version: "1.0.0",
    hasPermission: 0,
    credits: "YourName",
    description: "Hiển thị danh sách lệnh hoặc thông tin chi tiết về lệnh",
    commandCategory: "Utility",
    usages: "[tên lệnh]",
    cooldowns: 5,
};

module.exports.run = async function ({ client, message, args }) {
    const prefix = (global.data.guildData.get(message.guildId) || {}).PREFIX || global.config.prefix;

    // Nếu không có args, hiển thị tất cả lệnh
    if (args.length === 0) {
        const categories = {};

        for (const [name, cmd] of global.commands.entries()) {
            if (name !== cmd.config.name) continue; // Bỏ qua aliases

            const category = cmd.config.commandCategory || "Khác";
            if (!categories[category]) categories[category] = [];
            categories[category].push(cmd.config.name);
        }

        const embed = new EmbedBuilder()
            .setColor(global.config.colors.primary)
            .setTitle(`📚 ${global.config.botName} - Danh sách lệnh`)
            .setDescription(`Prefix hiện tại: \`${prefix}\`\nSử dụng \`${prefix}help [tên lệnh]\` để xem chi tiết`)
            .setFooter({ text: `Tổng cộng ${global.commands.size} lệnh` })
            .setTimestamp();

        for (const [category, commands] of Object.entries(categories)) {
            embed.addFields({
                name: `${category} (${commands.length})`,
                value: commands.map(c => `\`${c}\``).join(', '),
                inline: false
            });
        }

        return message.reply({ embeds: [embed] });
    }

    // Hiển thị thông tin chi tiết về lệnh
    const commandName = args[0].toLowerCase();
    const command = global.commands.get(commandName);

    if (!command) {
        return message.reply(`❌ Không tìm thấy lệnh \`${commandName}\``);
    }

    const embed = new EmbedBuilder()
        .setColor(global.config.colors.info)
        .setTitle(`📖 Thông tin lệnh: ${command.config.name}`)
        .addFields(
            { name: '📝 Mô tả', value: command.config.description || 'Không có mô tả', inline: false },
            { name: '📂 Danh mục', value: command.config.commandCategory || 'Khác', inline: true },
            { name: '⏱️ Cooldown', value: `${command.config.cooldowns || 0}s`, inline: true },
            { name: '🔐 Quyền hạn', value: command.config.hasPermission === 2 ? 'Admin Bot' : command.config.hasPermission === 1 ? 'Admin Server' : 'Mọi người', inline: true },
            { name: '💡 Cách dùng', value: `\`${prefix}${command.config.name} ${command.config.usages || ''}\``, inline: false }
        );

    if (command.config.aliases && command.config.aliases.length > 0) {
        embed.addFields({
            name: '🔄 Aliases',
            value: command.config.aliases.map(a => `\`${a}\``).join(', '),
            inline: false
        });
    }

    message.reply({ embeds: [embed] });
};