const express = require('express');
const router = express.Router();
const axios = require('axios');

const SECRET_KEY = "ISSecretKey_live_fd36bff8-8e0d-4e5b-bfd1-10737236cb3a";
const PUBLIC_KEY = "ISPubKey_live_694c3c3b-e43e-4ee5-b357-40fea5e86c18"; // ⚠️ ADD THIS

router.get('/', async (req, res) => {
    try {
        let { amount, number } = req.query;

        if (!number) {
            return res.json({ status: false, message: "Number required" });
        }

        if (!amount) amount = 100;

        // ✅ format phone
        number = number.replace(/\D/g, "");
        if (number.startsWith("0")) {
            number = "254" + number.slice(1);
        }

        const response = await axios.post(
            "https://sandbox.intasend.com/api/v1/payment/mpesa-stk-push/",
            {
                public_key: PUBLIC_KEY,        // ✅ REQUIRED
                amount: amount,
                phone_number: number,          // ✅ FIXED
                currency: "KES",               // ✅ REQUIRED
                account_reference: "BUGBOT",
                narration: "Payment to Bugfixed Sulexh Tech" // ✅ FIXED
            },
            {
                headers: {
                    Authorization: `Bearer ${SECRET_KEY}`, // ✅ KEEP
                    "Content-Type": "application/json"
                }
            }
        );

        res.json({
            status: true,
            message: "STK Push Sent",
            data: response.data
        });

    } catch (err) {
        console.error("FULL ERROR:", err.response?.data || err.message);

        res.json({
            status: false,
            message: "Payment failed",
            error: err.response?.data || err.message
        });
    }
});

module.exports = router;
