const chalk = require("chalk");
const moment = require("moment-timezone");

async function getInfo(client, message) {
    try {
        const userName = message.author.username || `User ID: ${message.author.id}`;
        const guildName = message.guild ? message.guild.name : "DM";
        return { userName, guildName };
    } catch (e) {
        return {
            userName: `User ID: ${message.author.id}`,
            guildName: message.guild ? `Guild ID: ${message.guild.id}` : "DM"
        };
    }
}

function formatLog(type, data) {
    const { userName, guildName, commandName, body, time } = data;
    let color;

    switch (type) {
        case "COMMAND": color = chalk.hex("#8A2BE2"); break; // Tím
        case "NOPREFIX": color = chalk.hex("#00BFFF"); break; // Xanh dương
        case "EVENT": color = chalk.hex("#32CD32"); break;    // Xanh lá
        default: color = chalk.white;
    }

    console.log(color(`╭─── 「 ${type} 」`));
    console.log(color(`│`) + ` 🙍‍♂️ User: ${chalk.white(userName)}`);
    console.log(color(`│`) + ` 💬 Guild: ${chalk.white(guildName)}`);
    console.log(color(`│`) + ` 📜 Name: ${chalk.white(commandName)}`);
    if (body) {
        const truncatedBody = body.length > 100 ? body.substring(0, 100) + "..." : body;
        console.log(color(`│`) + ` 📖 Body: ${chalk.dim.white(truncatedBody)}`);
    }
    console.log(color(`│`) + ` 🕒 Time: ${chalk.white(time)}`);
    console.log(color(`╰─────────────────────────────\n`));
}

module.exports = async ({ client, message, commandName, type = "COMMAND" }) => {
    try {
        const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
        const { userName, guildName } = await getInfo(client, message);
        const body = message.content;

        formatLog(type, { userName, guildName, commandName, body, time });
    } catch (e) {
        console.error(chalk.red("Lỗi khi ghi log:"), e);
    }
};