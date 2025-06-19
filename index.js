// ✅ Usa crypto nativo do Node.js (essencial para ambiente como Render)
global.crypto = require("crypto").webcrypto;

// 🧩 Dependências
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const express = require("express");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

let sock;

// 🧹 Limpa sessão anterior (caso necessário, pode comentar)
if (fs.existsSync("./auth_info")) {
  fs.rmSync("./auth_info", { recursive: true, force: true });
  console.log("🧹 Sessão anterior removida.");
}

// ⚙️ Middlewares
app.use(fileUpload({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  useTempFiles: true,
  tempFileDir: "/tmp/"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🤖 Inicializa conexão WhatsApp
async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr }) => {
    if (qr) {
      console.log("📲 Escaneie o QR code:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      console.log("✅ Conectado ao WhatsApp!");
    }
    if (connection === "close") {
      console.log("🔌 Conexão encerrada. Tentando reconectar...");
      startSock();
    }
  });
}
startSock();


// 📩 Enviar texto simples
app.post("/send-text", async (req, res) => {
  if (!sock) return res.status(500).send("❌ WhatsApp não conectado.");
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).send("⚠️ Parâmetros 'to' e 'message' são obrigatórios.");

  try {
    await sock.sendMessage(to, { text: message });
    res.send("✅ Mensagem enviada com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem:", err);
    res.status(500).send("Erro ao enviar mensagem.");
  }
});


// 🎥 Enviar vídeo com legenda via upload
app.post("/send-video", async (req, res) => {
  if (!sock) return res.status(500).send("❌ WhatsApp não conectado.");
  const { grupo, legenda } = req.body;
  const arquivo = req.files?.file;
  if (!grupo || !arquivo) return res.status(400).send("⚠️ Parâmetros obrigatórios 'grupo' e 'file' ausentes.");

  try {
    const buffer = fs.readFileSync(arquivo.tempFilePath || arquivo.data);
    await sock.sendMessage(grupo, {
      video: buffer,
      mimetype: "video/mp4",
      caption: legenda || ""
    });
    res.send("✅ Vídeo enviado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao enviar vídeo:", err);
    res.status(500).send("Erro ao enviar vídeo.");
  }
});


// 🖼️ Enviar imagem via URL
app.post("/send-image", async (req, res) => {
  if (!sock) return res.status(500).send("❌ WhatsApp não conectado.");
  const { to, imageUrl, caption } = req.body;
  if (!to || !imageUrl) return res.status(400).send("⚠️ Parâmetros 'to' e 'imageUrl' obrigatórios.");

  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    await sock.sendMessage(to, {
      image: buffer,
      caption: caption || ""
    });

    res.send("✅ Imagem enviada com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao enviar imagem:", err);
    res.status(500).send("Erro ao enviar imagem.");
  }
});


// 🧾 Listar grupos
app.get("/groups", async (req, res) => {
  if (!sock) return res.status(500).json({ error: "❌ WhatsApp não conectado." });

  try {
    const groups = await sock.groupFetchAllParticipating();
    const lista = Object.values(groups).map(g => ({
      id: g.id,
      subject: g.subject
    }));
    res.json(lista);
  } catch (err) {
    console.error("❌ Erro ao listar grupos:", err);
    res.status(500).json({ error: "Erro ao listar grupos." });
  }
});


// 🚀 Inicia o servidor
app.listen(port, () => {
  console.log(`🟢 Servidor rodando na porta ${port}`);
});
