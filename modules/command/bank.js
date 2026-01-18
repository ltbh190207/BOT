const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const dataPath = path.join(__dirname, "..", "..", "data", "bank.json");

module.exports.config = {
    name: "bank",
    aliases: ["atm", "balance"],
    version: "1.0.0",
    hasPermission: 0,
    credits: "GPT",
    description: "Quản lý tài khoản ngân hàng: xem thông tin, chuyển tiền",
    commandCategory: "Economy",
    usages: "[trade @user số_tiền]",
    cooldowns: 10
};

// Utility functions
function circleImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

async function drawBackground(ctx, canvas) {
    try {
        const backgroundPath = path.join(__dirname, "..", "..", "data", "pic", "bank_background.png");
        const background = await loadImage(backgroundPath);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (e) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#0F2027");
        gradient.addColorStop(0.5, "#203A43");
        gradient.addColorStop(1, "#2C5364");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

module.exports.run = async function ({ client, message, args }) {
    const command = args[0]?.toLowerCase();

    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({}));
    }

    let bankData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // TRADE/TRANSFER command
    if (command === "trade" || command === "transfer") {
        let recipientID, amount;

        // Check for mentions
        if (message.mentions.users.size > 0) {
            recipientID = message.mentions.users.first().id;
            amount = parseInt(args[args.length - 1]);
        } else if (message.reference) {
            // Reply to message
            const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
            recipientID = repliedMessage.author.id;
            amount = parseInt(args[1]);
        } else {
            return message.reply("❌ Vui lòng tag người nhận hoặc reply tin nhắn của họ!");
        }

        if (!amount || isNaN(amount) || amount < 1000) {
            return message.reply("❌ Số tiền chuyển tối thiểu là 1,000 VNĐ!");
        }

        if (recipientID === message.author.id) {
            return message.reply("❌ Bạn không thể tự chuyển tiền cho chính mình!");
        }

        // Check accounts
        if (!bankData[message.author.id]) {
            return message.reply("❌ Bạn chưa có tài khoản ngân hàng. Dùng `!bank` để đăng ký!");
        }
        if (!bankData[recipientID]) {
            return message.reply("❌ Người nhận chưa có tài khoản ngân hàng!");
        }
        if (bankData[message.author.id].balance < amount) {
            return message.reply(`❌ Số dư không đủ! Bạn còn thiếu ${(amount - bankData[message.author.id].balance).toLocaleString('vi-VN')} VNĐ`);
        }

        // Process transaction
        bankData[message.author.id].balance -= amount;
        bankData[recipientID].balance += amount;
        fs.writeFileSync(dataPath, JSON.stringify(bankData, null, 4));

        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('✅ GIAO DỊCH THÀNH CÔNG')
            .addFields(
                { name: '👤 Người gửi', value: message.author.username, inline: true },
                { name: '👥 Người nhận', value: `<@${recipientID}>`, inline: true },
                { name: '💰 Số tiền', value: `${amount.toLocaleString('vi-VN')} VNĐ`, inline: false },
                { name: '💳 Số dư còn lại', value: `${bankData[message.author.id].balance.toLocaleString('vi-VN')} VNĐ`, inline: false }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    // VIEW BALANCE - Create account if doesn't exist
    if (!bankData[message.author.id]) {
        bankData[message.author.id] = {
            name: message.author.username,
            userID: message.author.id,
            balance: 100000,
            registeredIn: {
                guildName: message.guild?.name || "DM",
                guildID: message.guild?.id || "DM"
            }
        };
        fs.writeFileSync(dataPath, JSON.stringify(bankData, null, 4));

        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('🎉 CHÀO MỪNG ĐẾN VỚI DISCORD-BANK')
            .setDescription(`Tài khoản của ${message.author.username} đã được tạo!`)
            .addFields(
                { name: '💰 Số dư khởi đầu', value: '100,000 VNĐ', inline: false }
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    // Show existing balance
    const userData = bankData[message.author.id];
    const embed = new EmbedBuilder()
        .setColor('#2C5364')
        .setTitle('🏦 DISCORD-BANK')
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
            { name: '👤 Chủ tài khoản', value: userData.name, inline: true },
            { name: '🆔 User ID', value: userData.userID, inline: true },
            { name: '💰 Số dư', value: `${userData.balance.toLocaleString('vi-VN')} VNĐ`, inline: false }
        )
        .setFooter({ text: 'Chuyển tiền? Gõ: !bank trade @user [số tiền]' })
        .setTimestamp();

    message.reply({ embeds: [embed] });
};