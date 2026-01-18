module.exports = {
    // Token bot Discord (lấy từ Discord Developer Portal)
    token: "",

    // Tên bot
    botName: "Discord-Bot",

    // Prefix mặc định
    prefix: "!",

    // Ngôn ngữ
    language: "vi",

    // Admin IDs (Discord User IDs)
    adminUID: ["1144743140545273926"],

    // Gemini API Key (cho AI features)
    GEMINI_API_KEY: "",

    // Channel IDs đặc biệt (tùy chọn)
    welcomeChannel: "", // Channel ID để gửi tin nhắn chào mừng
    logChannel: "", // Channel ID để ghi log

    // Màu sắc cho embeds
    colors: {
        primary: "#5865F2", // Discord Blurple
        success: "#57F287",
        error: "#ED4245",
        warning: "#FEE75C",
        info: "#5865F2"
    }
};
