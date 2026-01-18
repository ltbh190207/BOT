const chalk = require("chalk");
const logger = require("./logger");

module.exports = async ({ client, message, member, reaction, user, eventType }) => {
    // Helper functions
    const Users = {
        getNameUser: async (userId) => {
            try {
                if (!global.data.userNameCache) global.data.userNameCache = new Map();
                if (global.data.userNameCache.has(userId)) {
                    return global.data.userNameCache.get(userId);
                }
                const user = await client.users.fetch(userId);
                const name = user.username || `User ID: ${userId}`;
                global.data.userNameCache.set(userId, name);
                return name;
            } catch (e) {
                return `User ID: ${userId}`;
            }
        }
    };

    const Guilds = {
        getInfo: async (guildId) => {
            try {
                if (!global.data.guildInfoCache) global.data.guildInfoCache = new Map();
                if (global.data.guildInfoCache.has(guildId)) {
                    return global.data.guildInfoCache.get(guildId);
                }
                const guild = await client.guilds.fetch(guildId);
                global.data.guildInfoCache.set(guildId, guild);
                return guild;
            } catch (e) {
                return { name: `Guild ID: ${guildId}` };
            }
        }
    };

    try {
        // Xử lý events từ thư mục /event
        for (const [name, eventModule] of global.events.entries()) {
            const { eventType: moduleEventType } = eventModule.config;

            if (moduleEventType && moduleEventType.includes(eventType)) {
                if (eventType === 'messageCreate') {
                    logger({ client, message, commandName: name, type: 'EVENT' });
                }

                await eventModule.handleEvent({
                    client,
                    message,
                    member,
                    reaction,
                    user,
                    Users,
                    Guilds
                });
            }
        }

        // Xử lý hasEvent từ commands
        if (eventType === 'messageCreate' && message) {
            for (const [name, command] of global.commands.entries()) {
                if (command.config.hasEvent === true && typeof command.handleEvent === 'function') {
                    logger({ client, message, commandName: name, type: 'EVENT' });
                    await command.handleEvent({ client, message, Users, Guilds });
                }
            }
        }
    } catch (e) {
        console.error(chalk.red("❌ Lỗi nghiêm trọng trong handleEvent:"), e);
    }
};