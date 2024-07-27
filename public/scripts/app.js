let keys = [];

// Function to generate keys
async function generateKeys() {
    const generateBtn = document.getElementById('generateKeysButton');
    const keyType = document.getElementById('keyType').value;
    const password = document.getElementById('keyPassword').value;
    const comment = document.getElementById('keyComment').value;
    const email = document.getElementById('keyEmail').value;

    generateBtn.disabled = true;
    generateBtn.innerHTML = 'Generating...';

    await new Promise(resolve => setTimeout(resolve, 10));

    try {
        let privateKey, publicKey, fingerprint, expirationDate;

        if (keyType.startsWith('RSA')) {
            let rsaBits = parseInt(keyType.split('-')[1], 10);

            if (rsaBits === 4096) {
                alert("Generating RSA-4096 key, this may take a while...");
            }

            const keyPair = await openpgp.generateKey({
                type: 'rsa',
                rsaBits: rsaBits,
                userIDs: [{ name: comment, email: email }],
                passphrase: password
            });

            privateKey = keyPair.privateKey;
            publicKey = keyPair.publicKey;
            const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
            fingerprint = publicKeyObj.getFingerprint();
            expirationDate = getExpirationTime(await publicKeyObj.getExpirationTime());
        }

        if (keyType.startsWith('ECC')) {
            const curveType = keyType.split('-')[1];
            const curve = `p${curveType}`;
            const keyPair = await openpgp.generateKey({
                type: 'ecc',
                curve: curve,
                userIDs: [{ name: comment, email: email }],
                passphrase: password
            });

            privateKey = keyPair.privateKey;
            publicKey = keyPair.publicKey;
            const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
            fingerprint = publicKeyObj.getFingerprint();
            expirationDate = getExpirationTime(await publicKeyObj.getExpirationTime());
        }

        keys.push({ privateKey, publicKey, email, comment, expirationDate, fingerprint });
        saveKeysToLocalStorage();
        refreshKeyList();
        alert('Keys generated successfully');
        document.getElementById('keyPassword').value = '';
        document.getElementById('keyComment').value = '';
        document.getElementById('keyEmail').value = '';
    } catch (error) {
        alert(`Error generating keys: ${error.message}`);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = 'Generate Keys';
    }
}

// Function to store keys
async function storeKeys() {
    const key = document.getElementById('key').value;

    let fingerprint, expirationDate, email, comment;
    let privateKey = null;
    let publicKey = null;

    try {
        // Try to read the key as a private key
        try {
            const privateKeyObj = await openpgp.readPrivateKey({ armoredKey: key });
            privateKey = key;
            publicKey = (await privateKeyObj.toPublic()).armor();
            fingerprint = privateKeyObj.getFingerprint();
            expirationDate = getExpirationTime(await privateKeyObj.getExpirationTime());

            const userIDs = privateKeyObj.getUserIDs();
            if (userIDs.length > 0) {
                const [userID] = userIDs[0].split('<');
                comment = userID.trim();
                email = userIDs[0].match(/<([^>]+)>/)[1];
            }
        } catch (error) {
            // If it fails, try to read it as a public key
            const publicKeyObj = await openpgp.readKey({ armoredKey: key });
            publicKey = key;
            fingerprint = publicKeyObj.getFingerprint();
            expirationDate = getExpirationTime(await publicKeyObj.getExpirationTime());

            const userIDs = publicKeyObj.getUserIDs();
            if (userIDs.length > 0) {
                const [userID] = userIDs[0].split('<');
                comment = userID.trim();
                email = userIDs[0].match(/<([^>]+)>/)[1];
            }
        }

        const existingKey = keys.find(k => k.fingerprint === fingerprint);
        if (existingKey) {
            alert('Key with this fingerprint already exists');
            return;
        }

        keys.push({ privateKey, publicKey, email, comment, expirationDate, fingerprint });
        saveKeysToLocalStorage();
        refreshKeyList();

        alert('Key stored successfully');
        document.getElementById('key').value = '';
    } catch (error) {
        alert(`Error storing key: ${error.message}`);
    }
}

// Function to view keys
function refreshKeyList() {
    const keysList = document.getElementById('keysList');
    keysList.innerHTML = '';

    keys.forEach((key, index) => {
        let copyPrivateKey = '';
        if (key.privateKey) {
            copyPrivateKey = `<button class="copyPrivateKeyButton bg-red-500 text-white px-2 py-1 rounded" data-index="${index}">Copy Private</button>`;
        }

        const row = `<tr>
            <td class="border px-4 py-2">${formatFingerprint(key.fingerprint)}</td>
            <td class="border px-4 py-2">${key.email}</td>
            <td class="border px-4 py-2">${key.expirationDate}</td>
            <td class="border px-4 py-2">${key.comment}</td>
            <td class="border px-4 py-2">
                <button class="copyPublicKeyButton bg-blue-500 text-white px-2 py-1 rounded" data-index="${index}">Copy Public</button>
                ${copyPrivateKey}
                <button class="deleteKeyButton bg-red-500 text-white px-2 py-1 rounded" data-id="${index}">Delete</button>
            </td>
        </tr>`;
        keysList.innerHTML += row;
    });

    attachCopyEventListeners();
    refreshKeySelectors();
}

// Function to save keys to local storage
function saveKeysToLocalStorage() {
    localStorage.setItem('pgpKeys', JSON.stringify(keys));
}

// Function to load keys from local storage
function loadKeysFromLocalStorage() {
    const storedKeys = localStorage.getItem('pgpKeys');
    if (storedKeys) {
        keys = JSON.parse(storedKeys);
    }
}

// Function to refresh all key select dropdowns
function refreshKeySelectors() {
    const keySelects = document.querySelectorAll('.keySelector');

    keySelects.forEach(select => {
        const type = select.dataset.type;
        select.innerHTML = '<option selected disabled value="">-- select PGP key --</option>';

        keys.forEach((key, index) => {
            const option = document.createElement('option');
            option.value = index;

            if (type === 'private' && key.privateKey === null) return;
            if (type === 'public' && key.publicKey === null) return;

            const email = key.email || '';
            const comment = key.comment || '';
            const fingerprint = formatFingerprint(key.fingerprint);

            let displayText = '';
            if (email) displayText += email;
            if (email && comment) displayText += ' - ';
            if (comment) displayText += comment;

            if (email || comment) {
                displayText += ` (${fingerprint})`;
            } else {
                displayText += fingerprint;
            }

            option.text = displayText;
            select.appendChild(option);
        });
    });
}

// Function to confirm copying private key with a security notice
function confirmCopyPrivateKey(index) {
    if (confirm("Are you sure you want to copy the private key? This is a sensitive action.")) {
        copyKey(keys[index].privateKey, true);
    }
}

// Function to copy key to clipboard with fallback
function copyKey(key, isPrivate) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(key).then(() => {
            alert(`${isPrivate ? 'Private' : 'Public'} key copied to clipboard.`);
        }).catch(err => {
            fallbackCopyKey(key);
            alert(`${isPrivate ? 'Private' : 'Public'} key copied to clipboard.`);
        });
    } else {
        fallbackCopyKey(key);
        alert(`${isPrivate ? 'Private' : 'Public'} key copied to clipboard.`);
    }
}

// Fallback function to copy key to clipboard
function fallbackCopyKey(key) {
    // Save current scroll position
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const textArea = document.createElement("textarea");
    textArea.value = key;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);

    // Restore previous scroll position
    window.scrollTo(scrollX, scrollY);
}

// Function to delete a key
function deleteKey(id) {
    keys.splice(id, 1);
    saveKeysToLocalStorage();
    refreshKeyList();
    alert('Key deleted successfully');
}

// Function to attach event listeners to copy buttons
function attachCopyEventListeners() {
    document.querySelectorAll('.copyPublicKeyButton').forEach(button => {
        button.addEventListener('click', function() {
            const index = this.dataset.index;
            copyKey(keys[index].publicKey, false);
        });
    });

    document.querySelectorAll('.copyPrivateKeyButton').forEach(button => {
        button.addEventListener('click', function() {
            const index = this.dataset.index;
            confirmCopyPrivateKey(index);
        });
    });

    document.querySelectorAll('.deleteKeyButton').forEach(button => {
        button.addEventListener('click', function() {
            if (confirm("Are you sure you want to delete this key?")) {
                deleteKey(this.dataset.id);
            }
        });
    });
}

// Function to encrypt a message
async function encryptMessage() {
    const message = document.getElementById('messageToEncrypt').value;
    const keyIndex = document.getElementById('keySelectEncrypt').value;
    const publicKey = keys[keyIndex].publicKey;

    try {
        const encryptedMessage = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: message }),
            encryptionKeys: await openpgp.readKey({ armoredKey: publicKey })
        });

        document.getElementById('encryptedMessage').value = encryptedMessage;
    } catch (error) {
        alert(`Error encrypting message: ${error.message}`);
    }
}

// Function to decrypt a message
async function decryptMessage() {
    const message = document.getElementById('messageToDecrypt').value;
    const keyIndex = document.getElementById('privateKeySelect').value;
    const privateKeyArmored = keys[keyIndex].privateKey;
    const password = document.getElementById('privateKeyPassword').value;

    try {
        let privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
        if (!privateKey.isDecrypted()) {
            privateKey = await openpgp.decryptKey({
                privateKey: privateKey,
                passphrase: password
            });
        }

        const decryptedMessage = await openpgp.decrypt({
            message: await openpgp.readMessage({ armoredMessage: message }),
            decryptionKeys: privateKey
        });

        document.getElementById('decryptedMessage').value = decryptedMessage.data;
    } catch (error) {
        alert(`Error decrypting message: ${error.message}`);
    }
}

// Function to sign a message
async function signMessage() {
    const message = document.getElementById('messageToSign').value;
    const keyIndex = document.getElementById('signPrivateKeySelect').value;
    const privateKeyArmored = keys[keyIndex].privateKey;
    const password = document.getElementById('signPrivateKeyPassword').value;

    try {
        let privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
        if (!privateKey.isDecrypted()) {
            privateKey = await openpgp.decryptKey({
                privateKey: privateKey,
                passphrase: password
            });
        }

        const signedMessage = await openpgp.sign({
            message: await openpgp.createCleartextMessage({ text: message }),
            signingKeys: privateKey,
            config: {
                preferredHashAlgorithm: openpgp.enums.hash.sha512
            }
        });

        document.getElementById('signedMessage').value = signedMessage;
    } catch (error) {
        alert(`Error signing message: ${error.message}`);
    }
}

// Function to verify a signed message
async function verifyMessage() {
    const message = document.getElementById('messageToVerify').value;
    const keyIndex = document.getElementById('verifyPublicKeySelect').value;
    const publicKeyArmored = keys[keyIndex].publicKey;

    try {
        const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
        const cleartextMessage = await openpgp.readCleartextMessage({ cleartextMessage: message });
        const verificationResult = await openpgp.verify({
            message: cleartextMessage,
            verificationKeys: publicKey
        });

        const { verified } = verificationResult.signatures[0];
        try {
            await verified;
            alert('Signature is valid');
        } catch (e) {
            alert('Signature is invalid');
        }
    } catch (error) {
        alert(`Signature is invalid. ${error.message}`);
    }
}

// Function to select text in a textarea
function selectText(element) {
    element.select();
}

// Attach event listeners on document load
document.addEventListener('DOMContentLoaded', () => {
    loadKeysFromLocalStorage();
    refreshKeyList();

    document.getElementById('generateKeysButton').addEventListener('click', generateKeys);
    document.getElementById('storeKeysButton').addEventListener('click', storeKeys);
    document.getElementById('reloadKeysButton').addEventListener('click', refreshKeyList);
    document.getElementById('encryptMessageButton').addEventListener('click', encryptMessage);
    document.getElementById('decryptMessageButton').addEventListener('click', decryptMessage);
    document.getElementById('signMessageButton').addEventListener('click', signMessage);
    document.getElementById('verifyMessageButton').addEventListener('click', verifyMessage);

    document.querySelectorAll('textarea[readonly]').forEach(textarea => {
        textarea.addEventListener('click', function() {
            selectText(this);
        });
    });
});

function formatFingerprint(fingerprint) {
    return fingerprint.replace(/(.{4})/g, '$1 ');
}

function getExpirationTime(expirationTime) {
    return expirationTime === Infinity ? 'Never' : expirationTime.toISOString().split('T')[0];
}