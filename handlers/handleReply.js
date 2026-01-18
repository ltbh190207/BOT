const chalk = require("chalk");

module.exports = async ({ client, message }) => {
    if (!message.reference || !global.client.handleReply) return;

    const handleReply = global.client.handleReply.find(
        h => h.messageID === message.reference.messageId
    );

    if (!handleReply) return;

    const commandModule = global.commands.get(handleReply.name);
    if (!commandModule || typeof commandModule.handleReply !== 'function') {
        return;
    }

    try {
        await commandModule.handleReply({ client, message, handleReply });
    } catch (e) {
        console.error(chalk.red(`❌ Lỗi khi chạy handleReply cho "${handleReply.name}":`), e);
    }
};