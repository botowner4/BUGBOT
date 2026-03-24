const axios = require('axios');

async function receiveCommand(sock, chatId, message, userMessage) {
    try {
        let args = userMessage.trim().split(" ");

        let amount = args[1];
        let number = args[2];

        if (!number) {
            number = amount;
            amount = 100;
        }

        if (!number) {
            await sock.sendMessage(chatId, {
                text: "❌ Usage:\n.receive 200 2547xxxxxx\nor\n.receive 2547xxxxxx"
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            text: `💳 Sending payment request...\n📞 ${number}\n💰 KES ${amount}`
        }, { quoted: message });

        // ⚠️ USE YOUR REAL DOMAIN HERE
        const res = await axios.get(`https://bugbot-i3yc.onrender.com/receive?amount=${amount}&number=${number}`);

        if (res.data.status) {
            await sock.sendMessage(chatId, {
                text: "✅ Payment prompt sent. Check phone 📲"
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${res.data.message}`
            }, { quoted: message });
        }

    } catch (err) {
        console.error("Command error:", err.message);

        await sock.sendMessage(chatId, {
            text: "❌ Error sending payment request"
        }, { quoted: message });
    }
}

module.exports = receiveCommand;
