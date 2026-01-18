// ===============================
// 🤖 DISCORD BOT - MAIN INDEX
// ===============================
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const config = require('./config');

// --- BANNER ---
console.log(chalk.blue(`
██████╗ ██╗███████╗ ██████╗ ██████╗ ██████╗ ██████╗     ██████╗  ██████╗ ████████╗
██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝
██║  ██║██║███████╗██║     ██║   ██║██████╔╝██║  ██║    ██████╔╝██║   ██║   ██║   
██║  ██║██║╚════██║██║     ██║   ██║██╔══██╗██║  ██║    ██╔══██╗██║   ██║   ██║   
██████╔╝██║███████║╚██████╗╚██████╔╝██║  ██║██████╔╝    ██████╔╝╚██████╔╝   ██║   
╚═════╝ ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝     ╚═════╝  ╚═════╝    ╚═╝   
`));

// === Cấu hình ===
const RESTART_DELAY_MS = 10000;

// --- HÀM KHỞI ĐỘNG CHÍNH ---
function startBot() {
    console.log(chalk.yellow("🔄 Đang kiểm tra và khởi động bot..."));

    // Tạo Discord Client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.DirectMessages
        ],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction]
    });

    // Khởi tạo global objects
    global.client = {
        handleReply: [],
        handleReaction: [],
        bot: client
    };
    global.config = config;

    // Tạo thư mục cần thiết
    const dataPath = path.join(__dirname, "data");
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
    const cachePath = path.join(__dirname, "cache");
    if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

    // Khởi tạo data maps
    const prefixesPath = path.join(dataPath, "prefixes.json");
    let guildData = new Map();
    if (fs.existsSync(prefixesPath)) {
        try {
            const rawData = fs.readFileSync(prefixesPath, "utf8");
            if (rawData) guildData = new Map(Object.entries(JSON.parse(rawData)));
        } catch (e) {
            console.log(chalk.red("❌ Không thể tải dữ liệu prefix:", e));
        }
    }

    global.data = {
        guildData,
        userData: new Map(),
        userNameCache: new Map(),
        guildInfoCache: new Map()
    };

    // Khởi tạo Collections cho commands và events
    global.commands = new Map();
    global.events = new Map();
    global.noprefix = new Map();

    // Load modules
    const modulePaths = {
        command: path.join(__dirname, "modules/command"),
        event: path.join(__dirname, "modules/event"),
        noprefix: path.join(__dirname, "modules/noprefix")
    };

    console.log(chalk.cyan("🔄 Đang tải các module..."));
    for (const type in modulePaths) {
        const modulePath = modulePaths[type];
        if (!fs.existsSync(modulePath)) continue;

        for (const file of fs.readdirSync(modulePath)) {
            if (!file.endsWith(".js")) continue;
            try {
                delete require.cache[require.resolve(path.join(modulePath, file))];
                const module = require(path.join(modulePath, file));
                if (!module.config || !module.config.name) continue;

                const { name } = module.config;
                if (type === 'command') global.commands.set(name, module);
                else if (type === 'event') global.events.set(name, module);
                else if (type === 'noprefix') global.noprefix.set(name, module);
            } catch (e) {
                console.log(chalk.red(`❌ Lỗi khi tải module ${file}:`), e);
            }
        }
    }

    console.log(chalk.green(`✅ Đã tải ${global.commands.size} lệnh, ${global.events.size} sự kiện, và ${global.noprefix.size} lệnh noprefix.`));

    // Load handlers
    const handleMessage = require("./handlers/handleMessage");
    const handleEvent = require("./handlers/handleEvent");
    const handleReply = require("./handlers/handleReply");
    const handleReaction = require("./handlers/handleReaction");

    // Bot ready event
    client.once('ready', () => {
        console.log(chalk.green(`\n🤖 Bot ${client.user.tag} đã đăng nhập thành công!`));
        console.log(chalk.cyan(`📢 Prefix mặc định: ${config.prefix}`));
        console.log(chalk.cyan(`🔧 Đang phục vụ ${client.guilds.cache.size} servers`));

        // Set bot status
        client.user.setPresence({
            activities: [{
                name: `${config.prefix}help | ${client.guilds.cache.size} servers`,
                type: 0 // 0 = Playing
            }],
            status: 'online'
        });

        // Chạy onLoad cho các modules
        console.log(chalk.cyan("🔄 Khởi động các module onLoad..."));
        for (const [name, module] of [...global.commands, ...global.events]) {
            if (module.onLoad && typeof module.onLoad === 'function') {
                try {
                    module.onLoad({ client });
                    console.log(chalk.green(`  > onLoad của "${name}" đã chạy`));
                } catch (e) {
                    console.error(chalk.red(`  > Lỗi khi gọi onLoad của "${name}":`), e.message);
                }
            }
        }

        console.log(chalk.cyan("✅ Hoàn tất khởi động.\n"));
        console.log(chalk.gray("💬 Bot đang lắng nghe tin nhắn...\n"));
    });

    // Message event
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        try {
            await handleMessage({ client, message });
            await handleEvent({ client, message, eventType: 'messageCreate' });
        } catch (e) {
            console.error(chalk.red("❌ Lỗi khi xử lý tin nhắn:"), e);
        }
    });

    // Message reaction events
    client.on('messageReactionAdd', async (reaction, user) => {
        try {
            await handleReaction({ client, reaction, user, type: 'add' });
            await handleEvent({ client, reaction, user, eventType: 'messageReactionAdd' });
        } catch (e) {
            console.error(chalk.red("❌ Lỗi khi xử lý reaction:"), e);
        }
    });

    // Guild member add event
    client.on('guildMemberAdd', async (member) => {
        try {
            await handleEvent({ client, member, eventType: 'guildMemberAdd' });
        } catch (e) {
            console.error(chalk.red("❌ Lỗi khi xử lý member join:"), e);
        }
    });

    // Guild member remove event
    client.on('guildMemberRemove', async (member) => {
        try {
            await handleEvent({ client, member, eventType: 'guildMemberRemove' });
        } catch (e) {
            console.error(chalk.red("❌ Lỗi khi xử lý member leave:"), e);
        }
    });

    // Error handling
    client.on('error', error => {
        console.error(chalk.red('❌ Discord client error:'), error);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error(chalk.red('❌ Uncaught Exception:'), error);
        console.log(chalk.yellow('🔄 Khởi động lại bot sau 5 giây...'));
        setTimeout(startBot, 5000);
    });

    // Login
    client.login(config.token).catch(err => {
        console.error(chalk.red("❌ Lỗi đăng nhập:"), err);
        setTimeout(startBot, RESTART_DELAY_MS);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log(chalk.yellow("\n👋 Đang tắt bot..."));
        client.destroy();
        process.exit(0);
    });
}

// Khởi động bot
startBot();