# 💞 36 Questions — Couple Game

![Status](https://img.shields.io/badge/status-active-success)
![Platform](https://img.shields.io/badge/platform-web-informational)
![Backend](https://img.shields.io/badge/backend-none-ff69b4)
![Sessions](https://img.shields.io/badge/sessions-share%20link-blueviolet)
![Merge](https://img.shields.io/badge/merge-smart%20conflicts-orange)
![Export](https://img.shields.io/badge/export-PDF-pink)
![License](https://img.shields.io/badge/license-MIT-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

💌 Write → 🔒 Lock → 👀 Reveal  
🧠 Smart merge · ⚠️ Conflict resolution · 📄 PDF export  
🚫 No backend · 🔗 Shareable sessions · ❤️ Hearts everywhere

---

## ✨ What this is

A **no-backend** web app for couples based on the *36 Questions* game.

Each of you answers privately.  
Answers stay hidden until **both** of you lock them.

No accounts.  
No servers.  
Just you two.

---

## 🎮 How it works

1. 📝 Both players answer the question
2. 🔒 Lock your answer when ready
3. 👀 Answers reveal **only when both are locked**
4. 🔁 Repeat for all 36 questions
5. 🧾 Compare everything on the **Conclusion page**

---

## 🔗 Sessions & syncing

- Progress is stored in **localStorage**
- Sessions are shared via a **link** (`#s=...`)
- Partner pastes the link → **Import & merge**

---

## 🧠 Smart merge logic

Importing a partner link **never blindly overwrites** data.

Rules:
- 🔒 Locked answers beat unlocked ones
- 🕳️ Empty answers can be filled
- ⚠️ Different answers create a **conflict**

Conflicts are shown in UI and can be resolved:
- ✅ Keep mine
- 🔁 Keep theirs
- 🔍 View details

---

## 📄 PDF export

- End the game → **Conclusion**
- Export answers side-by-side to **PDF**
- ❤️ Hearts background included

⚠️ Enable **“Background graphics”** in the print dialog.

---

## 🗂️ Tech stack

- 🧠 Vanilla JavaScript
- 🎨 HTML + CSS
- 💾 localStorage
- 🔗 URL-encoded sessions
- 🖨️ Browser print → PDF

No frameworks.  
No backend.  
No dependencies.

---

## 🔒 Privacy note

Session links are **encoded, not encrypted**.

- Anyone with the link can access the data
- Don’t share links publicly
- For real security → backend or encryption required

---

## 🛠️ Customization

- ❤️ Change hearts background → replace `hand-drawn-heart-1.png`
- ❓ Edit questions → `js/questions.js`
- 🎨 Tweak UI → `css/style.css`

---

## 🧭 Ideas for future improvements

- ⚠️ Conflict icons in answered table
- 🧹 Resolve conflicts on Conclusion page
- 📦 JSON export/import
- 🔐 Optional passphrase encryption
- 🔄 Realtime sync (WebRTC / Firebase)

---

## 🤝 Contributing

PRs welcome ❤️  
UI polish, UX ideas, or merge logic improvements are all appreciated.

---

## 📄 License

MIT
