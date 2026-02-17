/**
 * 🌐📀 Video Music Downloader Bot
 * Version: 1.0
 * Author: BUGFIXED-SULEXH
 * Platform-ready: Works on Android Termux, Katabump, VPS, Windows, Linux
 * Description: Search YouTube or provide a URL, download audio as MP3.
 */

const fs = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");
const yts = require("youtube-yts");
const { ytDlp } = require("yt-dlp-exec"); // Node.js-friendly yt-dlp

// ==========================
// 🔎 YouTube URL Validation
// ==========================
const ytIdRegex =
  /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;

// ==========================
// 🎵 YTDownloader Class
// ==========================
class YTDownloader {
  static isYTUrl(url) {
    return ytIdRegex.test(url);
  }

  // 🔍 Search YouTube for a query string
  static async search(query) {
    const result = await yts(query);
    return result.videos || [];
  }

  // 🎶 Download audio from YouTube
  static async downloadMusic(query) {
    let videoUrl;

    if (this.isYTUrl(query)) {
      videoUrl = query;
    } else {
      const results = await this.search(query);
      if (!results.length) throw new Error("❌ No results found for query: " + query);
      videoUrl = results[0].url;
    }

    // Create temp folder if missing
    const tempFolder = path.join(__dirname, "temp");
    if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

    const fileName = randomBytes(4).toString("hex") + ".mp3";
    const outputPath = path.join(tempFolder, fileName);

    console.log(`🎬 Downloading: ${videoUrl}`);
    console.log(`💾 Saving to: ${outputPath}`);

    // Use yt-dlp-exec to download
    await ytDlp(videoUrl, {
      extractAudio: true,
      audioFormat: "mp3",
      output: outputPath
    });

    console.log("✅ Download complete!");
    return { path: outputPath };
  }
}

// ==========================
// 🚀 Example Usage
// ==========================
(async () => {
  try {
    console.log("🌐 Starting Video Music Downloader Bot...");

    const query = "Rick Astley Never Gonna Give You Up"; // Replace with user input or variable
    const result = await YTDownloader.downloadMusic(query);

    console.log(`🎵 MP3 File Path: ${result.path}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
