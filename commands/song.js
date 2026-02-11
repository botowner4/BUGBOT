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

        if (!text) {
            return sock.sendMessage(chatId, {
                text: 'Usage: .song <song name or youtube link>'
            }, { quoted: message });
        }

        let video;

        if (text.includes('youtube.com') || text.includes('youtu.be')) {
            video = { url: text, title: 'YouTube Audio' };
        } else {
            const search = await yts(text);
            if (!search.videos.length) {
                return sock.sendMessage(chatId, {
                    text: 'No results found.'
                }, { quoted: message });
            }
            video = search.videos[0];
        }

        await sock.sendMessage(chatId, {
            text: `🎵 Downloading: *${video.title}*`
        }, { quoted: message });

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const filePath = path.join(tempDir, `${Date.now()}.mp3`);

        await ytdlp(video.url, {
            format: 'bestaudio',
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: 0,
            output: filePath
        });

        await sock.sendMessage(chatId, {
            audio: { url: filePath },
            mimetype: 'audio/mpeg',
            fileName: 'song.mp3'
        }, { quoted: message });

        fs.unlinkSync(filePath);

    } catch (err) {
        console.log("YT-DLP ERROR:", err);

        await sock.sendMessage(chatId, {
            text: '❌ Failed to download song.'
        }, { quoted: message });
    }
}

module.exports = songCommand;
