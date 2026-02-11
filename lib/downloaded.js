const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const yts = require("yt-search");

const isYoutube = (text) =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(text);

const ensureDir = (type) => {
  const dir = path.join(process.cwd(), type);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

async function downloadMedia(input, type = "audio") {
  try {
    let url = input;

    // Search if not link
    if (!isYoutube(input)) {
      const search = await yts(input);
      if (!search.videos.length) {
        return { status: false, message: "No results found" };
      }
      url = search.videos[0].url;
    }

    const folder = ensureDir(type === "audio" ? "audio" : "video");

    let command;

    if (type === "audio") {
      command = `yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o "${folder}/%(title)s.%(ext)s" "${url}"`;
    } else {
      command = `yt-dlp -f best -o "${folder}/%(title)s.%(ext)s" "${url}"`;
    }

    return new Promise((resolve) => {
      exec(command, (err) => {
        if (err) {
          console.log(err.message);
          return resolve({ status: false, message: "Download failed" });
        }

        resolve({
          status: true,
          message: "Download successful",
          folder
        });
      });
    });

  } catch (err) {
    console.log(err.message);
    return { status: false, message: "System error" };
  }
}

module.exports = { downloadMedia };
