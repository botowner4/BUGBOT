const yts = require('yt-search');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

async function videoCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const query = text.split(' ').slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: 'Usage: .video <video name or youtube link>'
            }, { quoted: message });
        }

        let videoUrl;
        let videoTitle = 'Video';

        // If direct YouTube link
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            videoUrl = query;
        } else {
            const search = await yts(query);

            if (!search.videos.length) {
                return sock.sendMessage(chatId, {
                    text: 'No videos found.'
                }, { quoted: message });
            }

            videoUrl = search.videos[0].url;
            videoTitle = search.videos[0].title;
        }

        await sock.sendMessage(chatId, {
            text: `🎬 Downloading: *${videoTitle}*`
        }, { quoted: message });

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const filePath = path.join(tempDir, `${Date.now()}.mp4`);

        await ytdlp(videoUrl, {
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
            output: filePath
        });

        await sock.sendMessage(chatId, {
            video: { url: filePath },
            mimetype: 'video/mp4',
            fileName: 'video.mp4',
            caption: `🎬 *${videoTitle}*

╭━━━〔 BUGFIXED SULEXH XMD 〕━━━⬣
┃ 🚀 High Speed Video Downloader
┃ ⚡ Powered by SULEXH TECH
╰━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: message });

        fs.unlinkSync(filePath);

    } catch (error) {
        console.error('[VIDEO ERROR]', error);

        await sock.sendMessage(chatId, {
            text: '❌ Failed to download video.'
        }, { quoted: message });
    }
}

module.exports = videoCommand;
