const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

module.exports.config = {
    name: "welcome",
    eventType: ["guildMemberAdd"],
    version: "1.0.0",
    credits: "YourName",
    description: "Chào mừng thành viên mới"
};

function circleImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

module.exports.handleEvent = async function ({ client, member }) {
    try {
        const guild = member.guild;

        // Tìm kênh chào mừng (có "welcome" trong tên hoặc kênh đầu tiên)
        let channel = guild.channels.cache.find(
            ch => ch.name.toLowerCase().includes('welcome') && ch.type === 0
        );

        if (!channel) {
            channel = guild.channels.cache.find(
                ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages')
            );
        }

        if (!channel) return;

        // Tạo ảnh chào mừng
        const canvas = createCanvas(1200, 400);
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#667eea");
        gradient.addColorStop(1, "#764ba2");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Load avatar
        const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512 });
        const avatar = await loadImage(avatarURL);

        // Draw avatar với border
        const avatarSize = 200;
        const avatarX = 100;
        const avatarY = 100;

        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 20;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        circleImage(ctx, avatar, avatarX, avatarY, avatarSize);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Arial';
        ctx.fillText('WELCOME!', 400, 150);

        ctx.font = '40px Arial';
        ctx.fillText(member.user.username, 400, 220);

        ctx.font = '30px Arial';
        ctx.fillStyle = '#f0f0f0';
        ctx.fillText(`Member #${guild.memberCount}`, 400, 270);

        ctx.font = 'italic 25px Arial';
        ctx.fillText(`Welcome to ${guild.name}!`, 400, 320);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });

        const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle(`🎉 Chào mừng ${member.user.username}!`)
            .setDescription(`Chào mừng <@${member.id}> đến với **${guild.name}**!\nBạn là thành viên thứ **${guild.memberCount}** của chúng tôi!`)
            .setImage('attachment://welcome.png')
            .setTimestamp();

        channel.send({ embeds: [embed], files: [attachment] });
    } catch (error) {
        console.error("❌ Lỗi khi tạo ảnh welcome:", error);
    }
};