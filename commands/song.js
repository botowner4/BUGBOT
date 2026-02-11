const yts = require('yt-search');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

async function songCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const query = text.split(' ').slice(1).join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: 'Usage: .song <song name or youtube link>'
            }, { quoted: message });
        }

        let videoUrl;
        let videoTitle = 'Song';

        // If direct YouTube link
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            videoUrl = query;
        } else {
            const search = await yts(query);

            if (!search.videos.length) {
                return sock.sendMessage(chatId, {
                    text: 'No results found.'
                }, { quoted: message });
            }

            videoUrl = search.videos[0].url;
            videoTitle = search.videos[0].title;
        }

        await sock.sendMessage(chatId, {
            text: `🎵 Downloading: *${videoTitle}*`
        }, { quoted: message });

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const filePath = path.join(tempDir, `${Date.now()}.mp3`);

        await ytdlp(videoUrl, {
            format: 'bestaudio',
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            output: filePath
        });

        await sock.sendMessage(chatId, {
            audio: { url: filePath },
            mimetype: 'audio/mpeg',
            fileName: 'song.mp3',
            caption: `🎵 *${videoTitle}*

╭━━━〔 BUGFIXED SULEXH XMD 〕━━━⬣
┃ 🚀 High Speed Audio Downloader
┃ ⚡ Powered by SULEXH TECH
╰━━━━━━━━━━━━━━━━━━⬣`,
            ptt: false
        }, { quoted: message });

        fs.unlinkSync(filePath);

    } catch (error) {
        console.error('[SONG ERROR]', error);

        await sock.sendMessage(chatId, {
            text: '❌ Failed to download song.'
        }, { quoted: message });
    }
}

module.exports = songCommand;
