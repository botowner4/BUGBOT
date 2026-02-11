const yts = require('yt-search');
const ytdlp = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

async function convertToMp3(input, output) {
    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .audioBitrate(128)
            .toFormat('mp3')
            .save(output)
            .on('end', resolve)
            .on('error', reject);
    });
}

//////////////////////////////////////////////////////

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

        //////////////////////////////////////////////////////
        // SEARCH VIDEO
        //////////////////////////////////////////////////////

        let video;

        if (text.includes('youtube.com') || text.includes('youtu.be')) {

            video = { url: text, title: 'YouTube Audio' };

        } else {

            const search = await yts(text);

            if (!search.videos.length) {
                return sock.sendMessage(chatId, { text: 'No results found.' });
            }

            video = search.videos[0];
        }

        //////////////////////////////////////////////////////

        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail || 'https://i.imgur.com/8Km9tLL.png' },
            caption: `🎵 Downloading: *${video.title}*`
        }, { quoted: message });

        //////////////////////////////////////////////////////
        // DOWNLOAD USING yt-dlp
        //////////////////////////////////////////////////////

        const tempDir = path.join(__dirname, '../temp');

        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const rawFile = path.join(tempDir, `${Date.now()}.webm`);
        const mp3File = rawFile.replace('.webm', '.mp3');

        await ytdlp(video.url, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: rawFile
        });

        //////////////////////////////////////////////////////
        // Convert to MP3 (ensures compatibility)
        //////////////////////////////////////////////////////

        await convertToMp3(rawFile, mp3File);

        //////////////////////////////////////////////////////
        // SEND TO WHATSAPP
        //////////////////////////////////////////////////////

        const buffer = fs.readFileSync(mp3File);

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            ptt: false
        }, { quoted: message });

        //////////////////////////////////////////////////////
        // CLEANUP
        //////////////////////////////////////////////////////

        fs.unlinkSync(rawFile);
        fs.unlinkSync(mp3File);

    } catch (err) {

        console.log("YT-DLP ERROR:", err);

        await sock.sendMessage(chatId, {
            text: '❌ Failed to download song.'
        }, { quoted: message });
    }
}

module.exports = songCommand;
