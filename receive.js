const express = require('express');
const router = express.Router();
const axios = require('axios');

const SECRET_KEY = "ISSecretKey_live_fd36bff8-8e0d-4e5b-bfd1-10737236cb3a";

router.get('/', async (req, res) => {
    try {
        let { amount, number } = req.query;

        if (!number) {
            return res.json({ status: false, message: "Number required" });
        }

        if (!amount) amount = 100;

        const response = await axios.post(
           "https://payment.intasend.com/api/v1/payment/mpesa-stk-push/",// ⚠️ confirm this
            {
                amount: amount,
                phone: number,
                account_reference: "BUGBOT",
                transaction_desc: "Payment to Bugfixed Sulexh Tech"
            },
            {
                headers: {
                    Authorization: `Bearer ${SECRET_KEY}`,
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
        console.error("Receive error:", err.message);

        res.json({
            status: false,
            message: "Payment failed",
            error: err.message
        });
    }
});

module.exports = router;
