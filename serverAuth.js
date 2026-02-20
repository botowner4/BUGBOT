const express = require("express")
const P = require("pino")
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const app = express()
const PORT = process.env.PORT || 3000

let pairingCode = null

async function startSession() {
  const { state, saveCreds } = await useMultiFileAuthState("./session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    browser: ["BUGBOT", "Chrome", "1.0.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      if (shouldReconnect) startSession()
    }

    if (connection === "open") {
      console.log("✅ Session Connected Successfully!")
    }
  })

  // 🔥 Generate Pairing Code
  if (!sock.authState.creds.registered) {
    pairingCode = await sock.requestPairingCode("254768161116")
    console.log("Pairing Code:", pairingCode)
  }
}

startSession()

app.get("/", (req, res) => {
  res.send("BUGBOT Pairing Server Running ✅")
})

app.get("/pair", (req, res) => {
  if (!pairingCode) {
    return res.send("Pairing code not ready yet...")
  }
  res.send(`Your Pairing Code: ${pairingCode}`)
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
