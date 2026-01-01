(() => {
  const createBtn = document.getElementById('createBtn');
  const codeEl = document.getElementById('code');
  const statusEl = document.getElementById('status');
  const stopPollBtn = document.getElementById('stopPollBtn');
  const copyBtn = document.getElementById('copyBtn');
  const codeInput = document.getElementById('codeInput');
  const checkBtn = document.getElementById('checkBtn');
  const checkResult = document.getElementById('checkResult');
  const qrContainer = document.getElementById('qrContainer');
  const qrUrl = document.getElementById('qrUrl');

  let currentCode = null;
  let pollTimer = null;
  let qr = null;

  function setStatus(text, color) {
    statusEl.textContent = text;
    if (color === 'success') statusEl.style.borderColor = 'rgba(22,163,74,0.14)';
    else if (color === 'danger') statusEl.style.borderColor = 'rgba(239,68,68,0.12)';
    else statusEl.style.borderColor = 'rgba(255,255,255,0.02)';
  }

  async function createCode() {
    setStatus('Creating...');
    try {
      const res = await fetch('/create');
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        setStatus('Failed to create code: ' + (j.error || res.statusText), 'danger');
        return;
      }
      const j = await res.json();
      currentCode = j.code;
      codeEl.textContent = currentCode;
      setStatus('Waiting for bot to link this code...', '');
      updateQRCode();
      startPolling();
    } catch (err) {
      console.error(err);
      setStatus('Network error creating code', 'danger');
    }
  }

  function updateQRCode() {
    // Build a URL that opens this site and pre-fills the code (optional but handy)
    const base = location.origin + location.pathname;
    const url = base + '?code=' + encodeURIComponent(currentCode || '');
    qrUrl.textContent = currentCode ? url : 'No QR yet';
    // Render QR
    qrContainer.innerHTML = '';
    if (!currentCode) return;
    qr = new QRCode(qrContainer, {
      text: url,
      width: 140,
      height: 140,
      colorDark: "#0b1220",
      colorLight: "#f3fbff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  function startPolling() {
    if (!currentCode) return;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      try {
        const r = await fetch('/status/' + encodeURIComponent(currentCode));
        if (r.status === 404) {
          setStatus('Code expired or not found.', 'danger');
          clearInterval(pollTimer);
          pollTimer = null;
          return;
        }
        const j = await r.json();
        if (j.linked) {
          setStatus('Linked! sessionId: ' + j.sessionId, 'success');
          clearInterval(pollTimer);
          pollTimer = null;
        } else {
          // still waiting
        }
      } catch (err) {
        console.error(err);
        setStatus('Error checking status. See console.', 'danger');
      }
    }, 2000);
  }

  createBtn.onclick = createCode;
  stopPollBtn.onclick = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
      setStatus('Polling stopped.');
    }
  };
  copyBtn.onclick = async () => {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      setStatus('Code copied to clipboard.');
    } catch (err) {
      setStatus('Copy failed. Select and copy manually.');
    }
  };

  checkBtn.onclick = async () => {
    const code = (codeInput.value || '').trim().toUpperCase();
    if (!code) return;
    checkResult.textContent = 'Checking...';
    try {
      const r = await fetch('/status/' + encodeURIComponent(code));
      if (r.status === 404) {
        checkResult.textContent = 'Not found or expired.';
        return;
      }
      const j = await r.json();
      if (j.linked) checkResult.textContent = `Linked — sessionId: ${j.sessionId}`;
      else checkResult.textContent = `Not yet linked — expires at ${new Date(j.expiresAt).toLocaleString()}`;
    } catch (err) {
      console.error(err);
      checkResult.textContent = 'Error checking code.';
    }
  };

  // If the page is opened with ?code=XYZ, prefill and check once
  function checkQueryParam() {
    const params = new URLSearchParams(location.search);
    const code = (params.get('code') || '').trim().toUpperCase();
    if (!code) return;
    currentCode = code;
    codeEl.textContent = currentCode;
    updateQRCode();
    setStatus('Auto-checking code from URL...');
    // do one immediate check, then start polling
    (async () => {
      try {
        const r = await fetch('/status/' + encodeURIComponent(currentCode));
        if (r.status === 404) {
          setStatus('Code not found or expired.', 'danger');
          return;
        }
        const j = await r.json();
        if (j.linked) setStatus('Linked! sessionId: ' + j.sessionId, 'success');
        else {
          setStatus('Waiting for bot to link this code...');
          startPolling();
        }
      } catch (err) {
        console.error(err);
        setStatus('Error checking code from URL.', 'danger');
      }
    })();
  }

  // Initialize
  checkQueryParam();
})();
