const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports.config = {
    name: "reload",
    aliases: ["rl"],
    version: "1.0.0",
    hasPermission: 2,
    credits: "GPT",
    description: "Tải lại tất cả các module",
    commandCategory: "Admin",
    usages: "",
    cooldowns: 5,
};

module.exports.run = async function ({ client, message }) {
    const msg = await message.reply("🔄 Đang tải lại modules...");

    const modulePaths = [
        path.join(__dirname, "..", "command"),
        path.join(__dirname, "..", "event"),
        path.join(__dirname, "..", "noprefix")
    ];

    let loadedCount = 0;
    let failedCount = 0;

    try {
        // Clear cache
        Object.keys(require.cache).forEach(key => {
            if (modulePaths.some(p => key.startsWith(p))) {
                delete require.cache[key];
            }
        });

        // Clear old commands
        global.commands.clear();
        global.events.clear();
        global.noprefix.clear();

        // Reload modules
        for (const modulePath of modulePaths) {
            if (!fs.existsSync(modulePath)) continue;

            const files = fs.readdirSync(modulePath).filter(f => f.endsWith(".js"));
            const type = modulePath.includes('command') ? 'command' : 
                        modulePath.includes('event') ? 'event' : 'noprefix';

            for (const file of files) {
                const filePath = path.join(modulePath, file);
                try {
                    const module = require(filePath);

                    if (!module.config || !module.config.name) {
                        console.log(chalk.yellow(`⚠️ Skip invalid module: ${file}`));
                        failedCount++;
                        continue;
                    }

                    if (type === 'command') {
                        global.commands.set(module.config.name, module);
                        if (module.config.aliases) {
                            module.config.aliases.forEach(alias => 
                                global.commands.set(alias, module)
                            );
                        }
                    } else if (type === 'event') {
                        global.events.set(module.config.name, module);
                    } else if (type === 'noprefix') {
                        global.noprefix.set(module.config.name, module);
                    }

                    loadedCount++;
                } catch (err) {
                    console.error(chalk.red(`❌ Error loading ${file}:`), err);
                    failedCount++;
                }
            }
        }

        const embed = new EmbedBuilder()
            .setColor(global.config.colors.success)
            .setTitle('✅ Reload hoàn tất!')
            .addFields(
                { name: '✅ Thành công', value: `${loadedCount} modules`, inline: true },
                { name: '❌ Thất bại', value: `${failedCount} modules`, inline: true },
                { name: '📦 Tổng', value: `${global.commands.size} commands`, inline: false }
            )
            .setTimestamp();

        msg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error(chalk.red("❌ Critical error during reload:"), error);
        msg.edit("❌ Đã xảy ra lỗi nghiêm trọng khi reload!");
    }
};