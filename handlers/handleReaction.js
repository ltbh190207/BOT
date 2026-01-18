const chalk = require("chalk");

module.exports = async ({ client, reaction, user, type }) => {
    if (user.bot) return;
    if (!global.client.handleReaction || global.client.handleReaction.length === 0) return;

    // Fetch partial reactions
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the reaction:', error);
            return;
        }
    }

    const handle = global.client.handleReaction.find(
        h => h.messageID === reaction.message.id
    );

    if (!handle) return;

    const commandModule = global.commands.get(handle.name);
    if (!commandModule) return;

    try {
        if (commandModule.handleReaction) {
            await commandModule.handleReaction({
                client,
                reaction,
                user,
                type, // 'add' hoặc 'remove'
                handleReaction: handle
            });
        }
    } catch (e) {
        console.error(chalk.red("❌ Lỗi khi thực thi handleReaction:"), e);
    }
};