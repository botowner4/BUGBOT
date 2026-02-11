const axios = require("axios");
const yts = require("youtube-yts");

async function videoCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const args = text.trim().split(/\s+/);
        args.shift();
        const query = args.join(" ").trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: "Usage: .video <video name or YouTube link>"
            }, { quoted: message });
        }

        let videoUrl = query;

        // If not link → search automatically
        if (!query.includes("youtube.com") && !query.includes("youtu.be")) {
            const search = await yts(query);

            if (!search.videos.length) {
                return await sock.sendMessage(chatId, {
                    text: "❌ No videos found."
                }, { quoted: message });
            }

            videoUrl = search.videos[0].url;
        }

        await sock.sendMessage(chatId, {
            text: "🎬 Downloading video..."
        }, { quoted: message });

        // Direct MP4 API (raw file)
        const api = `https://api.vevioz.com/api/mp4?url=${encodeURIComponent(videoUrl)}`;

        const response = await axios.get(api, {
            responseType: "arraybuffer",
            timeout: 60000
        });

        await sock.sendMessage(chatId, {
            video: Buffer.from(response.data),
            mimetype: "video/mp4",
            fileName: "video.mp4",
            caption: "🎬 Here is your video"
        }, { quoted: message });

    } catch (err) {
        console.error("[VIDEO ERROR]", err.message);

        await sock.sendMessage(chatId, {
            text: "❌ Failed to download video."
        }, { quoted: message });
    }
}

module.exports = videoCommand;
