const path = require('path');
const fs = require('fs');
const YTDownloader = require('./lib/ytdl2'); // your class

async function songCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const query = text.split(' ').slice(1).join(' ').trim();
        if (!query) {
            return sock.sendMessage(chatId, {
                text: 'Usage: .song <name or YouTube link>'
            }, { quoted: message });
        }

        // Search if not a YouTube link
        let track;
        if (YTDownloader.isYTUrl(query)) {
            track = { url: query };
        } else {
            const results = await YTDownloader.searchTrack(query);
            if (!results.length) return sock.sendMessage(chatId, { text: 'No results found.' }, { quoted: message });
            track = results[0];
        }

        await sock.sendMessage(chatId, { text: `🎵 Downloading: *${track.title}*` }, { quoted: message });

        // Download using ytdl2
        const result = await YTDownloader.downloadMusic(track);

        // Send audio
        await sock.sendMessage(chatId, {
            audio: { url: result.path },
            mimetype: 'audio/mpeg',
            fileName: `${track.title}.mp3`,
            caption: `🎵 *${track.title}*\n\n╭━━━〔 BUGFIXED SULEXH XMD 〕━━━⬣\n┃ 🚀 Unlimited Audio Downloader\n┃ ⚡ Powered by SULEXH TECH\n╰━━━━━━━━━━━━━━━━━━⬣`,
            ptt: false
        }, { quoted: message });

        fs.unlink(result.path, () => {}); // cleanup

    } catch (err) {
        console.error('[SONG ERROR]', err);
        await sock.sendMessage(chatId, { text: '❌ Download failed.' }, { quoted: message });
    }
}

module.exports = songCommand;
