/**
 * serverAuth.js
 * 
 * Purpose: Generate first master WhatsApp session for pairing.
 * Generates creds.json in project/serversession
 */

const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { default: Gifted_Tech, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers } = require('maher-zubair-baileys');

// Ensure serversession folder exists
const sessionFolder = path.join(__dirname, 'project', 'serversession');
if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder, { recursive: true });
    console.log('[INFO] Created folder:', sessionFolder);
}

// Generate random ID for temp folder
function makeid(length = 8) {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// Main function to generate session
async function generateSession() {
    const id = makeid();
    const tempPath = path.join(__dirname, 'temp', id);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);

    try {
        console.log('[INFO] Initializing bot...');
        const bot = Gifted_Tech({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
            },
            printQRInTerminal: true, // Optional: shows QR in terminal
            logger: pino({ level: 'fatal' }),
            browser: Browsers.chrome('Desktop'),
        });

        bot.ev.on('creds.update', saveCreds);

        bot.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log('[SUCCESS] WhatsApp session connected!');

                // Copy creds.json to serversession folder
                const credsPath = path.join(tempPath, 'creds.json');
                const targetPath = path.join(sessionFolder, 'creds.json');

                if (fs.existsSync(credsPath)) {
                    fs.copyFileSync(credsPath, targetPath);
                    console.log('[SUCCESS] Master session saved at:', targetPath);
                } else {
                    console.error('[ERROR] creds.json not found!');
                }

                console.log('[INFO] Closing temporary bot...');
                await bot.ws.close();

                // Clean up temp folder
                fs.rmSync(tempPath, { recursive: true, force: true });
                console.log('[INFO] Temporary files removed.');

                process.exit(0);
            } else if (connection === 'close') {
                if (lastDisconnect && lastDisconnect.error && lastDisconnect.error.output?.statusCode !== 401) {
                    console.log('[WARN] Connection closed. Retrying in 5s...');
                    await delay(5000);
                    generateSession();
                } else {
                    console.log('[INFO] Connection closed. Exiting.');
                    process.exit(1);
                }
            }
        });

    } catch (err) {
        console.error('[ERROR] Failed to generate session:', err);
        fs.rmSync(tempPath, { recursive: true, force: true });
        process.exit(1);
    }
}

// Run the session generator
generateSession();
