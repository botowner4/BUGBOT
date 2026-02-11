const path = require('path');
const fs = require('fs');
const YTDownloader = require('./lib/ytdl2');

async function videoCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const query = text.split(' ').slice(1).join(' ').trim();
        if (!query) {
            return sock.sendMessage(chatId, {
                text: 'Usage: .video <name or YouTube link>'
            }, { quoted: message });
        }

        // Search if not a YouTube link
        let videoUrl;
        let videoTitle = 'Video';

        if (YTDownloader.isYTUrl(query)) {
            videoUrl = query;
        } else {
            const results = await YTDownloader.search(query);
            if (!results.length) return sock.sendMessage(chatId, { text: 'No videos found.' }, { quoted: message });
            videoUrl = results[0].url;
            videoTitle = results[0].title;
        }

        await sock.sendMessage(chatId, { text: `🎬 Downloading: *${videoTitle}*` }, { quoted: message });

        // Download video using ytdl2
        const info = await YTDownloader.mp4(videoUrl);

        await sock.sendMessage(chatId, {
            video: { url: info.videoUrl },
            mimetype: 'video/mp4',
            fileName: `${info.title}.mp4`,
            caption: `🎬 *${info.title}*\n\n╭━━━〔 BUGFIXED SULEXH XMD 〕━━━⬣\n┃ 🚀 Unlimited Video Downloader\n┃ ⚡ Powered by SULEXH TECH\n╰━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: message });

    } catch (err) {
        console.error('[VIDEO ERROR]', err);
        await sock.sendMessage(chatId, { text: '❌ Download failed.' }, { quoted: message });
    }
}

module.exports = videoCommand;
