let keys = [];

function formatFingerprint(fp) {
    return (fp || '').toString().replace(/\s+/g, '').match(/.{1,4}/g)?.join(' ') ?? '';
}

function getExpirationTime(expirationTime) {
    if (expirationTime === Infinity || !expirationTime) return 'Never Expires';
    try {
        return new Date(expirationTime).toISOString().split('T')[0];
    } catch {
        return 'Never Expires';
    }
}

function announce(id, text) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = '';
    setTimeout(() => (node.textContent = text), 10);
}

function toast(text, tone = 'neutral') {
    if (tone === 'error') announce('alert', text);
    else announce('status', text);
    alert(text);
}

const htmlEl = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function iconSun() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M20 12h2M2 12h2m14.142 5.657l1.414 1.414M4.444 4.444l1.414 1.414m12.728 0l1.414-1.414M4.444 19.556l1.414-1.414"/></svg>`;
}
function iconMoon() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function applyTheme(mode) {
    htmlEl.classList.remove('theme--light', 'theme--dark', 'theme--auto', 'dark');
    const btn = document.getElementById('theme-toggle');
    if (mode === 'dark') {
        htmlEl.classList.add('theme--dark', 'dark');
        themeIcon.innerHTML = iconSun();
        btn?.setAttribute('aria-pressed', 'true');
        localStorage.setItem('pgpbox-theme', 'dark');
    } else if (mode === 'light') {
        htmlEl.classList.add('theme--light');
        themeIcon.innerHTML = iconMoon();
        btn?.setAttribute('aria-pressed', 'false');
        localStorage.setItem('pgpbox-theme', 'light');
    } else {
        htmlEl.classList.add('theme--auto');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        themeIcon.innerHTML = prefersDark ? iconSun() : iconMoon();
        btn?.setAttribute('aria-pressed', prefersDark ? 'true' : 'false');
        localStorage.setItem('pgpbox-theme', 'auto');
    }
}

function initTheme() {
    const saved = localStorage.getItem('pgpbox-theme') || 'auto';
    applyTheme(saved);
    themeToggle?.addEventListener('click', () => {
        const current = localStorage.getItem('pgpbox-theme') || 'auto';
        const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
        applyTheme(next);
    });
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const mode = localStorage.getItem('pgpbox-theme') || 'auto';
        if (mode === 'auto') applyTheme('auto');
    });
}

function saveKeysToLocalStorage() {
    localStorage.setItem('pgpKeys', JSON.stringify(keys));
}

function loadKeysFromLocalStorage() {
    const stored = localStorage.getItem('pgpKeys');
    if (stored) {
        try { keys = JSON.parse(stored) || []; }
        catch { keys = []; }
    }
}

function attachCopyEventListeners() {
    document.querySelectorAll('.copyPublicKeyButton').forEach((button) => {
        button.addEventListener('click', () => copyKey(keys[button.dataset.index].publicKey, false));
    });
    document.querySelectorAll('.copyPrivateKeyButton').forEach((button) => {
        button.addEventListener('click', () => confirmCopyPrivateKey(button.dataset.index));
    });
    document.querySelectorAll('.deleteKeyButton').forEach((button) => {
        button.addEventListener('click', () => deleteKey(button.dataset.index));
    });
}

function refreshKeySelectors() {
    document.querySelectorAll('.keySelector').forEach((select) => {
        const type = select.dataset.type;
        select.innerHTML = '<option selected disabled value="">— Select PGP Key —</option>';
        keys.forEach((key, index) => {
            if ((type === 'private' && !key.privateKey) || (type === 'public' && !key.publicKey)) return;
            const opt = document.createElement('option');
            opt.value = index;
            let label = '';
            if (key.email) label += key.email;
            if (key.email && key.comment) label += ' — ';
            if (key.comment) label += key.comment;
            label += ` (${formatFingerprint(key.fingerprint)})`;
            opt.textContent = label || formatFingerprint(key.fingerprint);
            select.appendChild(opt);
        });
    });
}

function refreshKeyList() {
    const keysList = document.getElementById('keysList');
    if (!keysList) return;
    keysList.innerHTML = '';

    keys.forEach((key, index) => {
        const hasPrivate = Boolean(key.privateKey && key.privateKey.trim());
        const tr = document.createElement('tr');

        tr.innerHTML = `
      <td>${formatFingerprint(key.fingerprint)}</td>
      <td>${key.email || '—'}</td>
      <td>${key.userLabel || '—'}</td>
      <td>${key.expirationDate || '—'}</td>
      <td>${key.comment || '—'}</td>
      <td class="whitespace-nowrap">
        <div class="flex flex-wrap gap-2 items-center">
          <!-- Copy Public -->
          <button class="btn btn-muted copyPublicKeyButton"
                  data-index="${index}" type="button" aria-label="Copy public key">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg"
                 fill="none" stroke="currentColor" stroke-width="1.6"
                 viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
            </svg>
            Public
          </button>

          <!-- Copy Private (rendered only if private key exists) -->
          ${hasPrivate ? `
          <button class="btn btn-danger copyPrivateKeyButton"
                  data-index="${index}" type="button" aria-label="Copy private key">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg"
                 fill="none" stroke="currentColor" stroke-width="1.6"
                 viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
            </svg>
            Private
          </button>` : ''}

          <!-- Delete -->
          <button class="btn btn-danger deleteKeyButton"
                  data-index="${index}" type="button" aria-label="Delete key">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg"
                 fill="none" stroke="currentColor" stroke-width="1.6"
                 viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-2 14H7L5 6m5 0V4a2 2 0 012-2h2a2 2 0 012 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </td>
    `;

        keysList.appendChild(tr);
    });

    attachCopyEventListeners();
    refreshKeySelectors();
}

function confirmCopyPrivateKey(index) {
    if (confirm('Copying private keys is sensitive. Make sure your clipboard is secure. Proceed?')) {
        copyKey(keys[index].privateKey, true);
    }
}
function copyKey(key, isPrivate) {
    navigator.clipboard.writeText(key).then(() => {
        toast(`${isPrivate ? 'Private' : 'Public'} key copied to clipboard.`, 'success');
    }).catch(() => {
        toast('Failed to copy key. Please select and copy manually.', 'error');
    });
}

async function generateKeys() {
    const btn = document.getElementById('generateKeysButton');
    const keyType = document.getElementById('keyType').value;
    const password = document.getElementById('keyPassword').value;
    const comment = document.getElementById('keyComment').value;
    const email = document.getElementById('keyEmail').value;
    const expiration = document.getElementById('keyExpiration').value;

    if (!keyType) {
        toast('Please select a key algorithm and strength.', 'error');
        return;
    }

    btn.disabled = true;
    const prevText = btn.textContent;
    btn.textContent = 'Generating…';

    const expirationInSeconds = expiration ? Math.max(0, Math.floor((new Date(expiration) - new Date()) / 1000)) : 0;

    try {
        let keyPairOptions = {
            userIDs: [{ name: comment, email: email }],
            passphrase: password || undefined,
            keyExpirationTime: expirationInSeconds
        };

        if (keyType.startsWith('RSA')) {
            keyPairOptions.type = 'rsa';
            keyPairOptions.rsaBits = parseInt(keyType.split('-')[1], 10);
        } else if (keyType.startsWith('ECC')) {
            const size = keyType.split('-')[1];
            const curve = size === '256' ? 'p256' : size === '384' ? 'p384' : 'p521';
            keyPairOptions.type = 'ecc';
            keyPairOptions.curve = curve;
        }

        toast(`Generating ${keyType} key pair…`);
        const keyPair = await openpgp.generateKey(keyPairOptions);

        const publicKeyObj = await openpgp.readKey({ armoredKey: keyPair.publicKey });
        const fingerprint = publicKeyObj.getFingerprint('hex').toUpperCase();
        const expirationDate = getExpirationTime(await publicKeyObj.getExpirationTime());

        keys.push({
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            email,
            comment,
            expirationDate,
            fingerprint,
            userLabel: `${comment || ''} ${email ? `<${email}>` : ''}`.trim()
        });

        saveKeysToLocalStorage();
        refreshKeyList();
        toast('Key pair generated and stored.');
        document.getElementById('keyPassword').value = '';
        document.getElementById('keyComment').value = '';
        document.getElementById('keyEmail').value = '';
        document.getElementById('keyExpiration').value = '';
    } catch (error) {
        toast(`Failed to generate key pair: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = prevText;
    }
}

async function storeKeys() {
    const keyText = document.getElementById('key').value.trim();
    if (!keyText) {
        toast('Please paste a valid armored PGP key.', 'error');
        return;
    }

    let fingerprint, expirationDate, email = '', comment = '', userLabel = '';
    let privateKey = null;
    let publicKey = null;

    try {
        try {
            const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: keyText });
            privateKey = keyText;
            publicKey = (await privateKeyObj.toPublic()).armor();
            fingerprint = privateKeyObj.getFingerprint('hex').toUpperCase();
            expirationDate = getExpirationTime(await privateKeyObj.getExpirationTime());
            const uid = privateKeyObj.users?.[0]?.userID || {};
            comment = uid.comment || '';
            email = uid.email || '';
            userLabel = uid.userID || '';
        } catch {
            const publicKeyObj = await openpgp.readKey({ armoredKey: keyText });
            publicKey = keyText;
            fingerprint = publicKeyObj.getFingerprint('hex').toUpperCase();
            expirationDate = getExpirationTime(await publicKeyObj.getExpirationTime());
            const uid = publicKeyObj.users?.[0]?.userID || {};
            comment = uid.comment || '';
            email = uid.email || '';
            userLabel = uid.userID || '';
        }

        if (keys.some(k => k.fingerprint === fingerprint)) {
            toast('This key fingerprint is already stored.', 'error');
            return;
        }

        keys.push({ privateKey, publicKey, email, comment, expirationDate, fingerprint, userLabel });
        saveKeysToLocalStorage();
        refreshKeyList();
        toast('Key imported.');
        document.getElementById('key').value = '';
    } catch (error) {
        toast(`Failed to import key: ${error.message}`, 'error');
    }
}

async function encryptMessage() {
    const message = document.getElementById('messageToEncrypt').value.trim();
    const keyIndex = document.getElementById('keySelectEncrypt').value;

    if (!message) { toast('Please enter a message to encrypt.', 'error'); return; }
    if (keyIndex === '') { toast('Please select a recipient’s public key.', 'error'); return; }

    const publicKey = keys[keyIndex].publicKey;

    try {
        const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: message }),
            encryptionKeys: await openpgp.readKey({ armoredKey: publicKey })
        });
        document.getElementById('encryptedMessage').value = encrypted;
        toast('Message encrypted.');
    } catch (error) {
        toast(`Encryption failed: ${error.message}`, 'error');
    }
}

async function decryptMessage() {
    const message = document.getElementById('messageToDecrypt').value.trim();
    const keyIndex = document.getElementById('privateKeySelect').value;
    const password = document.getElementById('privateKeyPassword').value;

    if (!message) { toast('Please enter an encrypted message.', 'error'); return; }
    if (keyIndex === '') { toast('Please select your private key.', 'error'); return; }

    const privateKeyArmored = keys[keyIndex].privateKey;

    try {
        let privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
        if (privateKey.getKeys?.()[0]?.isEncrypted?.() && !password) {
            toast('This private key requires a passphrase.', 'error');
            return;
        }
        if (password) {
            privateKey = await openpgp.decryptKey({ privateKey, passphrase: password });
        }

        const decrypted = await openpgp.decrypt({
            message: await openpgp.readMessage({ armoredMessage: message }),
            decryptionKeys: privateKey
        });
        document.getElementById('decryptedMessage').value = decrypted.data || '';
        toast('Message decrypted.');
    } catch (error) {
        toast(`Decryption failed: ${error.message}`, 'error');
    }
}

async function signMessage() {
    const message = document.getElementById('messageToSign').value.trim();
    const keyIndex = document.getElementById('signPrivateKeySelect').value;
    const password = document.getElementById('signPrivateKeyPassword').value;

    if (!message) { toast('Please enter a message to sign.', 'error'); return; }
    if (keyIndex === '') { toast('Please select your private key.', 'error'); return; }

    const privateKeyArmored = keys[keyIndex].privateKey;

    try {
        let privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
        if (privateKey.getKeys?.()[0]?.isEncrypted?.() && !password) {
            toast('This private key requires a passphrase.', 'error');
            return;
        }
        if (password) {
            privateKey = await openpgp.decryptKey({ privateKey, passphrase: password });
        }

        const signed = await openpgp.sign({
            message: await openpgp.createCleartextMessage({ text: message }),
            signingKeys: privateKey,
            detached: false
        });
        document.getElementById('signedMessage').value = signed;
        toast('Message signed.');
    } catch (error) {
        toast(`Signing failed: ${error.message}`, 'error');
    }
}

async function verifyMessage() {
    const message = document.getElementById('messageToVerify').value.trim();
    const keyIndex = document.getElementById('verifyPublicKeySelect').value;

    if (!message) { toast('Please enter a signed message to verify.', 'error'); return; }
    if (keyIndex === '') { toast('Please select the sender’s public key.', 'error'); return; }

    const publicKeyArmored = keys[keyIndex].publicKey;

    try {
        const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

        let verified;

        if (/-----BEGIN PGP SIGNED MESSAGE-----/i.test(message)) {
            const clear = await openpgp.readCleartextMessage({ cleartextMessage: message });
            verified = await openpgp.verify({
                message: clear,
                verificationKeys: publicKey
            });
        } else if (/-----BEGIN PGP MESSAGE-----/i.test(message)) {
            const msg = await openpgp.readMessage({ armoredMessage: message });
            verified = await openpgp.verify({
                message: msg,
                verificationKeys: publicKey,
                expectSigned: true
            });
        } else {
            throw new Error('Unrecognized armored data. Paste a cleartext signed message (-----BEGIN PGP SIGNED MESSAGE-----) or an armored PGP message.');
        }

        const sig = verified?.signatures?.[0];
        const ok = await sig?.verified;

        if (ok) {
            toast('Signature verified. The message is authentic.');
        } else {
            toast('Signature verification failed.', 'error');
        }
    } catch (error) {
        if (/decryption/i.test(String(error)) || /session key/i.test(String(error))) {
            toast('This looks encrypted. Decrypt the message first, then verify its signature.', 'error');
            return;
        }
        toast(`Verification failed: ${error.message}`, 'error');
    }
}

function deleteKey(index) {
    if (confirm('Are you sure you want to delete this key? This action cannot be undone.')) {
        keys.splice(index, 1);
        saveKeysToLocalStorage();
        refreshKeyList();
        toast('Key deleted.');
    }
}

function bindActions() {
    document.getElementById('generateKeysButton')?.addEventListener('click', generateKeys);
    document.getElementById('storeKeysButton')?.addEventListener('click', storeKeys);
    document.getElementById('reloadKeysButton')?.addEventListener('click', refreshKeyList);
    document.getElementById('encryptMessageButton')?.addEventListener('click', encryptMessage);
    document.getElementById('decryptMessageButton')?.addEventListener('click', decryptMessage);
    document.getElementById('signMessageButton')?.addEventListener('click', signMessage);
    document.getElementById('verifyMessageButton')?.addEventListener('click', verifyMessage);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadKeysFromLocalStorage();
    refreshKeyList();
    bindActions();

    const today = new Date().toISOString().split('T')[0];
    const exp = document.getElementById('keyExpiration');
    if (exp) exp.setAttribute('min', today);
});
