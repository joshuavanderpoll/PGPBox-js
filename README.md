# 🔐 PGPBox (JavaScript Edition)
A user-friendly PGP Web GUI for generating, storing, encrypting, decrypting, signing, and verifying PGP messages — right in your browser.<br>
No backend, no external API calls: everything runs 100% locally, offline-capable.

## 🚀 Demo
[👉 Open PGPBox in your browser](https://joshuavanderpoll.github.io/PGPBox-js/public/)

## ✨ Features
- 🔑 Key Management
  - Generate new PGP key pairs (RSA / ECC)
  - Import existing public or private keys
  - Manage keys in local storage (persistent across sessions)
- 📩 Message Security
  - Encrypt messages with recipients’ public keys
  - Decrypt messages with your private key (passphrase supported)
- ✍️ Signing & Verification
  - Digitally sign messages with your private key
  - Verify signatures against known public keys
- 🎨 Modern UI
  - Clean, responsive interface built with Tailwind CSS
  - Light/Dark/Auto theme support
  - Accessible design with keyboard + screen reader support
- 📡 Offline First
    - No servers, no trackers, no external API calls
    - Works fully offline once downloaded

## 🖼 Preview
![PGPBox Preview](/images/preview.jpg)

## ⚙️ Technology Stack
- [OpenPGP.js](https://openpgpjs.org/) — robust OpenPGP implementation in JavaScript
- [Tailwind CSS](https://tailwindcss.com/) — modern styling framework
- Vanilla JS — no heavy frontend frameworks
- Browser Local Storage — all keys and data are stored securely client-side

🔒 Security Notes
- Your keys and messages never leave your browser.
- All PGP operations run locally using [OpenPGP.js](https://openpgpjs.org/).
- Keys are saved in LocalStorage — clear them manually if you are on a shared device.
- For maximum security, consider using a passphrase on your private key.

## 👩‍💻 Contributing
We welcome contributions from the community!
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "feat: Add new feature"`)
4. Push to your branch (`git push origin feature/my-feature`)
5. Open a Pull Request
👉 Issues and feature requests are also welcome via the [Issue Tracker](https://github.com/joshuavanderpoll/PGPBox-js/issues)

## 📬 Contact
- ✉️ Email: joshua@jvdpoll.nl
- 🔑 PGP Key: [F487 7BC1 D37E DA5C 0B87 0165 71A3 BBCA 23EA 532D](https://joshua-server.nl/pgp.txt)

## 📄 License
This project is licensed under the GPL-3.0 License