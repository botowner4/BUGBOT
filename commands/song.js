const axios = require("axios");
const yts = require("youtube-yts");

async function songCommand(sock, chatId, message) {
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
                text: "Usage: .song <song name or YouTube link>"
            }, { quoted: message });
        }

        let videoUrl = query;

        // If not link → search
        if (!query.includes("youtube.com") && !query.includes("youtu.be")) {
            const search = await yts(query);
            if (!search.videos.length) {
                return await sock.sendMessage(chatId, {
                    text: "❌ No results found."
                }, { quoted: message });
            }
            videoUrl = search.videos[0].url;
        }

        await sock.sendMessage(chatId, {
            text: "🎵 Downloading audio..."
        }, { quoted: message });

        // Direct MP3 API (raw file)
        const api = `https://api.vevioz.com/api/mp3?url=${encodeURIComponent(videoUrl)}`;

        const response = await axios.get(api, { responseType: "arraybuffer" });

        await sock.sendMessage(chatId, {
            audio: Buffer.from(response.data),
            mimetype: "audio/mpeg",
            fileName: "song.mp3"
        }, { quoted: message });

    } catch (err) {
        console.error("[SONG ERROR]", err.message);
        await sock.sendMessage(chatId, {
            text: "❌ Failed to download audio."
        }, { quoted: message });
    }
}

module.exports = songCommand;
