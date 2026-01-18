const { EmbedBuilder } = require('discord.js');

module.exports.config = {
    name: "goodbye",
    eventType: ["guildMemberRemove"],
    version: "1.0.0",
    credits: "YourName",
    description: "Thông báo khi thành viên rời server"
};

module.exports.handleEvent = async function ({ client, member }) {
    try {
        const guild = member.guild;

        // Tìm kênh goodbye
        let channel = guild.channels.cache.find(
            ch => (ch.name.toLowerCase().includes('goodbye') || ch.name.toLowerCase().includes('welcome')) && ch.type === 0
        );

        if (!channel) {
            channel = guild.channels.cache.find(
                ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages')
            );
        }

        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('👋 Tạm biệt!')
            .setDescription(`**${member.user.username}** đã rời khỏi server.`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '📊 Thành viên còn lại', value: `${guild.memberCount}`, inline: true }
            )
            .setTimestamp();

        channel.send({ embeds: [embed] });
    } catch (error) {
        console.error("❌ Lỗi khi gửi tin nhắn goodbye:", error);
    }
};