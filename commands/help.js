const settings = require('../settings');
const axios = require('axios');

async function helpCommand(sock, chatId, message) {
  try {
    const startTime = Date.now();

    // ===== SAFE LOADER =====
    await sock.sendMessage(chatId, {
      text: "🐉 BUGBOT SYSTEM BOOTING...\n⚡ Loading Ultimum Destroyer Menu..."
    }, { quoted: message });

    // ===== META DATA =====
    const imageURL = "https://files.catbox.moe/ip70j9.jpg";

    const runtime = ((Date.now() - startTime) / 1000).toFixed(2) + "s";
    const ping = Date.now() - startTime + "ms";

    // ===== MENU CONTENT =====
    const helpMessage = `
╔════════════════════════════════════╗
🐉 BUGFIXED SULEXH TECH BOT V10
🌌  NEVER USE HARM OTHERS🤖🤖☠️☠️
╚════════════════════════════════════╝

👤 User : ${message.pushName || "User"}
🤖 Bot  : ${settings.botName || "BUGBOT V10"}
⭐ Owner: ${settings.botOwner || "BUGFIXED SULEXH TECH"}

⚡ Runtime : ${runtime}
📡 Ping : ${ping}
────────────────────────────

▛▀ GENERAL MENU ▀▜
▌ .help
▌ .menu
▌ .alive
▌ .ping
▌ .owner
▌ .fact
▌ .joke
▌ .quote
▌ .weather <city>
▌ .news
▌ .tts <text>
▌ .attp <text>
▌ .lyrics <song_title>
▌ .8ball <question>
▌ .groupinfo
▌ .staff / .admins
▌ .vv
▌ .v
▌ .trt <text> <lang>
▌ .ss <link>
▌ .jid
▌ .url
▌ .quran menu
▌ .BUG MENU (premium)
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

▛▀ ADMIN COMMANDS ▀▜
▌ .ban @user
▌ .promote @user
▌ .demote @user
▌ .mute <minutes>
▌ .unmute
▌ .delete / .del
▌ .kick @user
▌ .warnings @user
▌ .warn @user
▌ .antilink
▌ .antibadword
▌ .clear
▌ .tag <message>
▌ .tagall
▌ .tagnotadmin
▌ .hidetag <message>
▌ .chatbot
▌ .resetlink
▌ .antitag <on/off>
▌ .welcome <on/off>
▌ .goodbye <on/off>
▌ .setgdesc <description>
▌ .setgname <new name>
▌ .setgpp (reply to image)
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

▛▀ OWNER COMMANDS ▀▜
▌ .mode <public/private>
▌ .clearsession
▌ .antidelete
▌ .cleartmp
▌ .update
▌ .settings
▌ .setpp <reply to image>
▌ .autoreact <on/off>
▌ .autostatus <on/off>
▌ .autostatus react <on/off>
▌ .autotyping <on/off>
▌ .autorecording <on/off>
▌ .alwaysonline <on/off>
▌ .autoread <on/off>
▌ .anticall <on/off>
▌ .pmblocker <on/off/status>
▌ .pmblocker setmsg <text>
▌ .setmention <reply to msg>
▌ .mention <on/off>
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

▛▀ BUGFIXED SULEXH COMMANDS ▀▜
▌ .pair <number>
▌ .user
▌ .depair <number>
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

▛▀ IMAGE & STICKER LAB ▀▜
▌ .sticker
▌ .simage
▌ .blur
▌ .removebg
▌ .remini
▌ .crop
▌ .meme
▌ .take <packname>
▌ .emojimix <emj1>+<emj2>
▌ .tgsticker <link>
▌ .igs <insta link>
▌ .igsc <insta link>
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

▛▀ DOWNLOADERS ▀▜
▌ .play <song_name>
▌ .song <song_name>
▌ .spotify <query>
▌ .instagram <link>
▌ .facebook <link>
▌ .tiktok <link>
▌ .video <song_name>
▌ .ytmp4 <link>
▌ .mediafire <link>
▌ .apk <link>
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

▛▀ FUN GAME ZONE ▀▜
▌ .truth
▌ .dare
▌ .riddle
▌ .rate
▌ .ship
▌ .fact
▌ .quote
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

▛▀ PREMIUM / SECRET ▀▜
▌ BUG MENU
▌ Flood Protection
▌ Hidden BUG Engine
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

╔════════════════════════════════════╗
👑 BUGFIXED SULEXH TECH
⚡ BUGBOT V10 WHATSAPP CRASHER☠️☠️
🚀 Future Bot Engineering
╚════════════════════════════════════╝
`;

    // ===== SEND IMAGE MENU =====
    await sock.sendMessage(chatId, {
      image: { url: imageURL },
      caption: helpMessage,
      footer: "👑 BUGFIXED SULEXH BOT",
      buttons: [
        {
          buttonId: "https://chat.whatsapp.com/GyZBMUtrw9LIlV6htLvkCK",
          buttonText: { displayText: "🔔 JOIN GROUP" },
          type: 1
        },
        {
          buttonId: "https://wa.me/254768161116",
          buttonText: { displayText: "👑 CONTACT OWNER" },
          type: 1
        }
      ],
      headerType: 4,
      contextInfo: { mentionedJid: [] }
    }, { quoted: message });

  } catch (error) {
    console.error("GOD MENU ERROR:", error);

    await sock.sendMessage(chatId, {
      text: "🐉 GOD MENU SYSTEM ERROR\nTry again later."
    }, { quoted: message });
  }
}

module.exports = helpCommand;
