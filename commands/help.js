st settings = require('../settings');
const axios = require('axios');

async function helpCommand(sock, chatId, message) {

const helpMessage = `
╔═══════════════════╗
   *🤖 ${settings.botName || 'BUGFIXED-SULEXH-XMD'}*  
   Version: *${settings.version || '3.0.5'}*
   by ${settings.botOwner || 'BUGFIXED-SULEXH-TECH'}
   YT : BUGFIXED-SULEXH-TECH
╚═══════════════════╝

*Available Commands*

╔═══════════════════╗
🌐 *General Commands*
║ ➤ .help / .menu
║ ➤ .ping
║ ➤ .alive
║ ➤ .tts <text>
║ ➤ .owner
║ ➤ .joke
║ ➤ .quote
║ ➤ .fact
║ ➤ .weather <city>
║ ➤ .news
║ ➤ .attp <text>
║ ➤ .lyrics <song_title>
║ ➤ .8ball <question>
║ ➤ .groupinfo
║ ➤ .staff / .admins
║ ➤ .vv
║ ➤ .v
║ ➤ .trt <text> <lang>
║ ➤ .ss <link>
║ ➤ .jid
║ ➤ .url
║ ➤ .quran menu
╚═══════════════════╝

╔═══════════════════╗
👮‍♂️ *Admin Commands*
║ ➤ .ban @user
║ ➤ .promote @user
║ ➤ .demote @user
║ ➤ .mute <minutes>
║ ➤ .unmute
║ ➤ .delete / .del
║ ➤ .kick @user
║ ➤ .warnings @user
║ ➤ .warn @user
║ ➤ .antilink
║ ➤ .antibadword
║ ➤ .clear
║ ➤ .tag <message>
║ ➤ .tagall
║ ➤ .tagnotadmin
║ ➤ .hidetag <message>
║ ➤ .chatbot
║ ➤ .resetlink
║ ➤ .antitag <on/off>
║ ➤ .welcome <on/off>
║ ➤ .goodbye <on/off>
║ ➤ .setgdesc <description>
║ ➤ .setgname <new name>
║ ➤ .setgpp (reply to image)
╚═══════════════════╝

╔═══════════════════╗
🔒 *Owner Commands*
║ ➤ .mode <public/private>
║ ➤ .clearsession
║ ➤ .antidelete
║ ➤ .cleartmp
║ ➤ .update
║ ➤ .settings
║ ➤ .setpp <reply to image>
║ ➤ .autoreact <on/off>
║ ➤ .autostatus <on/off>
║ ➤ .autostatus react <on/off>
║ ➤ .autotyping <on/off>
║ ➤ .autorecording <on/off>
║ ➤ .alwaysonline <on/off>
║ ➤ .autoread <on/off>
║ ➤ .anticall <on/off>
║ ➤ .pmblocker <on/off/status>
║ ➤ .pmblocker setmsg <text>
║ ➤ .setmention <reply to msg>
║ ➤ .mention <on/off>
╚═══════════════════╝

╔═══════════════════╗
🤖 *SaaS Control Panel*
║ ➤ .pair <number>
║ ➤ .user
║ ➤ .depair <number>
╚═══════════════════╝

╔═══════════════════╗
🎨 *Image/Sticker Commands*
║ ➤ .blur <image>
║ ➤ .simage <reply to sticker>
║ ➤ .sticker <reply to image>
║ ➤ .removebg
║ ➤ .remini
║ ➤ .crop <reply to image>
║ ➤ .tgsticker <link>
║ ➤ .meme
║ ➤ .take <packname>
║ ➤ .emojimix <emj1>+<emj2>
║ ➤ .igs <insta link>
║ ➤ .igsc <insta link>
╚═══════════════════╝

╔═══════════════════╗
📥 *Downloader*
║ ➤ .play <song_name>
║ ➤ .song <song_name>
║ ➤ .spotify <query>
║ ➤ .instagram <link>
║ ➤ .facebook <link>
║ ➤ .tiktok <link>
║ ➤ .video <song name>
║ ➤ .ytmp4 <Link>
╚═══════════════════╝

🔔 Join our OFFICIAL WhatsApp Channel below
`;

try {

    const videoURL = "https://files.catbox.moe/rxvkde.mp4";
    const audioURL = "";

    await sock.sendMessage(
        chatId,
        {
            video: { url: videoURL },
            caption: helpMessage,
            gifPlayback: true,
            footer: 'BUGFIXED-SULEXH-XMD',
            headerType: 4,
            contextInfo: {
                newsletterJid: "0029VbAD3222f3EIZyXe6w16@broadcast",
                newsletterName: "BUGFIXED-SULEXH-XMD",
                serverMessageId: -1
            }
        },
        { quoted: message }
    );

    const audio = await axios.get(audioURL, { responseType: 'arraybuffer' });

    await sock.sendMessage(chatId, {
        audio: audio.data,
        mimetype: 'audio/mpeg',
        ptt: false
    });

} catch (error) {

    console.error("HELP MENU ERROR:", error);

    await sock.sendMessage(chatId, { text: helpMessage });
}

}

module.exports = helpCommand;
