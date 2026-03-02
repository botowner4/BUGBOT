const settings = require('../settings');
const { isSudo } = require('./index');

/**
 * Stable Owner Authentication Checker
 */
async function isOwnerOrSudo(senderId) {

    try {

        if (!senderId) return false;

        const ownerNumber = settings.ownerNumber || "";

        const cleanSender = senderId
            .split(':')[0]
            .split('@')[0];

        const cleanOwner = ownerNumber
            .split(':')[0]
            .split('@')[0];

        // Direct owner match
        if (cleanSender === cleanOwner) {
            return true;
        }

        // Fallback sudo check
        try {
            return await isSudo(senderId);
        } catch {
            return false;
        }

    } catch (err) {

        console.error("❌ [isOwner] Error:", err);
        return false;
    }
}

module.exports = isOwnerOrSudo;
