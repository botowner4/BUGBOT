class PairingClient {
    constructor() {
        this.phoneInput = document.getElementById('phoneNumber');
        this.getCodeBtn = document.getElementById('getCodeBtn');
        this.statusMsg = document.getElementById('statusMsg');
        this.codeDisplay = document.getElementById('codeDisplay');
        this.credentialsDisplay = document.getElementById('credentialsDisplay');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadCredsBtn = document.getElementById('downloadCredsBtn');
        this.codeValue = document.getElementById('codeValue');
        this.expireTimer = document.getElementById('expireTimer');
        
        this.expiryTime = null;
        this.timerInterval = null;
        this.sessionData = null;
        
        this.init();
    }

    init() {
        this.getCodeBtn.addEventListener('click', () => this.getCode());
        this.copyBtn.addEventListener('click', () => this.copyCode());
        this.downloadCredsBtn.addEventListener('click', () => this.downloadCredentials());
        this.phoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.getCode();
        });
    }

    async getCode() {
        const phone = this.phoneInput.value.trim();
        
        if (!phone) {
            this.showStatus('Please enter your phone number', 'error');
            return;
        }

        if (!/^\d{10,15}$/.test(phone)) {
            this.showStatus('Invalid phone number. Use format: 254768161116', 'error');
            return;
        }

        this.getCodeBtn.disabled = true;
        const spinner = this.getCodeBtn.querySelector('.spinner');
        const btnText = this.getCodeBtn.querySelector('.btn-text');
        
        spinner.style.display = 'inline-block';
        btnText.textContent = 'Getting Code...';

        try {
            const response = await fetch('/api/pairing/request-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phoneNumber: phone })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get pairing code');
            }

            this.sessionData = data;
            this.displayCode(data.code, data.expiresAt);
            this.showStatus('✅ Pairing code generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.getCodeBtn.disabled = false;
            spinner.style.display = 'none';
            btnText.textContent = 'Get Pairing Code';
        }
    }

    displayCode(code, expiresAt) {
        this.codeValue.textContent = code;
        this.expiryTime = new Date(expiresAt).getTime();
        this.codeDisplay.style.display = 'block';
        this.credentialsDisplay.style.display = 'none';
        
        // Start expiry timer
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.updateTimer();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    updateTimer() {
        const now = new Date().getTime();
        const timeLeft = this.expiryTime - now;

        if (timeLeft <= 0) {
            clearInterval(this.timerInterval);
            this.codeDisplay.style.display = 'none';
            this.showStatus('⏰ Pairing code expired. Request a new one.', 'error');
            return;
        }

        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        this.expireTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    copyCode() {
        const code = this.codeValue.textContent;
        navigator.clipboard.writeText(code).then(() => {
            this.showStatus('✅ Code copied to clipboard!', 'success');
            setTimeout(() => this.hideStatus(), 3000);
        }).catch(() => {
            this.showStatus('❌ Failed to copy code', 'error');
        });
    }

    downloadCredentials() {
        if (!this.sessionData || !this.sessionData.credentials) {
            this.showStatus('❌ Credentials not available', 'error');
            return;
        }

        const dataStr = JSON.stringify(this.sessionData.credentials, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'creds.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showStatus('✅ Credentials downloaded!', 'success');
    }

    showStatus(message, type) {
        this.statusMsg.textContent = message;
        this.statusMsg.className = `status-msg ${type}`;
        this.statusMsg.style.display = 'block';
    }

    hideStatus() {
        this.statusMsg.style.display = 'none';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new PairingClient();
});
