const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const yts = require("youtube-yts");
const { randomBytes } = require("crypto");

const ytIdRegex =
  /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;

class YTDownloader {
  static isYTUrl(url) {
    return ytIdRegex.test(url);
  }

  static getVideoID(url) {
    if (!this.isYTUrl(url)) throw new Error("Invalid YouTube URL");
    return ytIdRegex.exec(url)[1];
  }

  static async search(query) {
    const result = await yts(query);
    return result.videos || [];
  }

  static async searchTrack(query) {
    const result = await yts(query);
    return result.videos || [];
  }

  static async downloadMusic(query) {
    let videoUrl;

    if (typeof query === "string" && this.isYTUrl(query)) {
      videoUrl = query;
    } else {
      const results =
        typeof query === "string"
          ? await this.searchTrack(query)
          : [query];

      if (!results.length) throw new Error("No results found");

      videoUrl = results[0].url;
    }

    const fileName = randomBytes(4).toString("hex") + ".mp3";
    const outputPath = path.join(__dirname, "../temp", fileName);

    if (!fs.existsSync(path.join(__dirname, "../temp"))) {
      fs.mkdirSync(path.join(__dirname, "../temp"), { recursive: true });
    }

    return new Promise((resolve, reject) => {
      exec(
        `yt-dlp -x --audio-format mp3 -o "${outputPath}" "${videoUrl}"`,
        (error) => {
          if (error) return reject(error);

          resolve({
            meta: { title: "Audio" },
            path: outputPath,
          });
        }
      );
    });
  }

  static async mp4(query) {
    let videoUrl;

    if (this.isYTUrl(query)) {
      videoUrl = query;
    } else {
      const results = await this.search(query);
      if (!results.length) throw new Error("No videos found");
      videoUrl = results[0].url;
    }

    return {
      videoUrl: `yt-dlp -f best -g "${videoUrl}"`,
    };
  }
}

module.exports = YTDownloader;
