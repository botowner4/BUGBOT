const fs = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");
const yts = require("youtube-yts");
const { ytDlp } = require("yt-dlp-exec"); // ✅ Node.js-friendly yt-dlp

const ytIdRegex =
  /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;

class YTDownloader {
  static isYTUrl(url) {
    return ytIdRegex.test(url);
  }

  static async search(query) {
    const result = await yts(query);
    return result.videos || [];
  }

  static async downloadMusic(query) {
    let videoUrl;

    if (this.isYTUrl(query)) {
      videoUrl = query;
    } else {
      const results = await this.search(query);
      if (!results.length) throw new Error("No results found");
      videoUrl = results[0].url;
    }

    // Create temp folder if it doesn't exist
    const tempFolder = path.join(__dirname, "temp");
    if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

    const fileName = randomBytes(4).toString("hex") + ".mp3";
    const outputPath = path.join(tempFolder, fileName);

    // Download with yt-dlp-exec
    await ytDlp(videoUrl, {
      extractAudio: true,
      audioFormat: "mp3",
      output: outputPath
    });

    return { path: outputPath };
  }
}

module.exports = YTDownloader;
