# 🤖 Discord Bot

Bot Discord đầy đủ tính năng với cấu trúc module hóa, dễ dàng mở rộng và quản lý.

## 📋 Tính năng

- ✅ Hệ thống lệnh module hóa (commands)
- ✅ Hệ thống sự kiện (events)
- ✅ Lệnh không cần prefix (noprefix)
- ✅ Hệ thống handleReply và handleReaction
- ✅ Prefix tùy chỉnh cho từng server
- ✅ Cooldown cho lệnh
- ✅ Phân quyền (User, Admin Server, Admin Bot)
- ✅ Welcome/Goodbye với ảnh Canvas
- ✅ Logger đầy đủ màu sắc
- ✅ Auto-restart khi có lỗi
- ✅ Admin tools (stats, ban, announce)

## 🚀 Cài đặt

### Yêu cầu
- Node.js >= 16.9.0
- NPM hoặc Yarn

### Các bước cài đặt

1. **Clone repository**
```bash
git clone <your-repo>
cd discord-bot
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Cấu hình bot**
Mở file `config.js` và điền các thông tin:
```javascript
{
    token: "YOUR_DISCORD_BOT_TOKEN",
    prefix: "!",
    botName: "Discord-DEV",
    adminUID: ["YOUR_DISCORD_USER_ID"]
}
```

4. **Lấy Discord Bot Token**
- Truy cập [Discord Developer Portal](https://discord.com/developers/applications)
- Tạo New Application
- Vào tab "Bot" → Reset Token → Copy token
- Bật tất cả Privileged Gateway Intents (Presence, Server Members, Message Content)
- Vào tab "OAuth2" → URL Generator
  - Chọn Scopes: `bot`
  - Chọn Bot Permissions: `Administrator`
  - Copy link mời bot vào server

5. **Chạy bot**
```bash
npm start
# Hoặc development mode với auto-restart
npm run dev
```

## 📁 Cấu trúc thư mục

```
discord-bot/
├── index.js              # File khởi động chính
├── config.js             # Cấu hình bot
├── package.json          # Dependencies
├── handlers/             # Các handler xử lý
│   ├── handleMessage.js  # Xử lý tin nhắn và lệnh
│   ├── handleEvent.js    # Xử lý sự kiện
│   ├── handleReply.js    # Xử lý reply
│   ├── handleReaction.js # Xử lý reaction
│   └── logger.js         # Logging system
├── modules/
│   ├── command/          # Các lệnh bot
│   │   ├── help.js
│   │   ├── ping.js
│   │   ├── admin.js
│   │   └── setprefix.js
│   ├── event/            # Các sự kiện
│   │   ├── welcome.js
│   │   └── goodbye.js
│   └── noprefix/         # Lệnh không cần prefix
│       └── prefix.js
├── data/                 # Dữ liệu lưu trữ
│   ├── prefixes.json
│   └── banned_guilds.json
└── cache/                # File tạm
```

## 🛠️ Tạo lệnh mới

### Command Module

Tạo file trong `modules/command/`:

```javascript
const { EmbedBuilder } = require('discord.js');

module.exports.config = {
    name: "tên_lệnh",
    aliases: ["alias1", "alias2"],
    version: "1.0.0",
    hasPermission: 0, // 0: Everyone, 1: Admin Server, 2: Admin Bot
    credits: "YourName",
    description: "Mô tả lệnh",
    commandCategory: "Category",
    usages: "[args]",
    cooldowns: 5, // giây
};

module.exports.run = async function ({ client, message, args }) {
    // Code xử lý lệnh
    message.reply("Hello!");
};
```

### Event Module

Tạo file trong `modules/event/`:

```javascript
module.exports.config = {
    name: "tên_event",
    eventType: ["guildMemberAdd", "messageCreate"],
    version: "1.0.0",
    credits: "YourName",
    description: "Mô tả event"
};

module.exports.handleEvent = async function ({ client, message, member }) {
    // Code xử lý event
};
```

### Noprefix Module

Tạo file trong `modules/noprefix/`:

```javascript
module.exports.config = {
    name: "tên_noprefix",
    version: "1.0.0",
    credits: "YourName",
    description: "Mô tả",
    keywords: ["từ khóa 1", "từ khóa 2"]
};

module.exports.run = function ({ client, message }) {
    // Code xử lý
};
```

## 📝 Các lệnh có sẵn

### User Commands
- `!help` - Hiển thị danh sách lệnh
- `!ping` - Kiểm tra độ trễ bot

### Admin Server Commands
- `!setprefix [prefix]` - Thay đổi prefix server

### Admin Bot Commands
- `!admin stats` - Xem thống kê bot
- `!admin ban` - Cấm server hiện tại
- `!admin unban [ID]` - Gỡ cấm server
- `!admin announce [text]` - Gửi thông báo toàn bot

### Noprefix Commands
- `prefix` - Xem prefix hiện tại

## 🎨 Tính năng nâng cao

### HandleReply
```javascript
// Trong command
const sent = await message.reply("Chọn 1 hoặc 2");
global.client.handleReply.push({
    name: this.config.name,
    messageID: sent.id,
    author: message.author.id,
    data: { /* custom data */ }
});

// Thêm handleReply function
module.exports.handleReply = async function ({ client, message, handleReply }) {
    // Xử lý reply
};
```

### HandleReaction
```javascript
// Trong command
const sent = await message.reply("React để chọn!");
await sent.react("✅");
global.client.handleReaction.push({
    name: this.config.name,
    messageID: sent.id,
    author: message.author.id
});

// Thêm handleReaction function
module.exports.handleReaction = async function ({ client, reaction, user, handleReaction }) {
    // Xử lý reaction
};
```

## 🔧 Troubleshooting

### Bot không online
- Kiểm tra token trong `config.js`
- Kiểm tra Privileged Gateway Intents đã bật chưa

### Lệnh không hoạt động
- Kiểm tra prefix
- Kiểm tra quyền bot trong server
- Xem log trong console

### Canvas không hoạt động
Cài đặt các dependencies cho Canvas:
```bash
# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# Windows
# Download from: https://github.com/Automattic/node-canvas/wiki/Installation:-Windows
```

## 📚 Resources

- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Canvas Documentation](https://www.npmjs.com/package/canvas)

## 📄 License

ISC

## 👨‍💻 Author

YourName

---

⭐ Nếu bạn thấy hữu ích, hãy star repo này!