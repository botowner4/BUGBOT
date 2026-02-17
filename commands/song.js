/**
 * 🌐🎵 Song Downloader Bot
 * File: song.js
 * Version: 1.0
 * Author: BUGGIXED SULEXH
 * Platform-ready: Works on Android Termux, Katabump, VPS, Windows, Linux
 * Description: Download audio from YouTube using search query or direct URL
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
    console.log("🌐 Starting Song Downloader Bot...");

    // Replace this with user input or a variable
    const query = "Imagine Dragons Believer"; // Example search query
    const result = await YTDownloader.downloadMusic(query);

    console.log(`🎵 MP3 File Path: ${result.path}`);
    console.log("🌟 Your song is ready!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
