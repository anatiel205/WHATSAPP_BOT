// ===============================
// index.js - Servidor WhatsApp Bot
// ===============================

// Usa crypto nativo do Node.js (não precisa de node-webcrypto-ossl)
global.crypto = require('crypto').webcrypto;

// Importa dependências
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const express = require("express");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

let sock; // Socket do WhatsApp

// Limpa sessão antiga (opcional)
if (fs.existsSync("./auth_info")) {
  fs.rmSync("./auth_info", { recursive: true, force: true });
  console.log("🧹 Sessão anterior removida.");
}

// Middlewares para upload e JSON
app.use(fileUpload({
  limits: { fileSize: 100 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: "/tmp/"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializa a conexão com WhatsApp
async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Evita warning de função descontinuada
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr }) => {
    if (qr) {
      console.log("📲 Escaneie o QR code:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      console.log("✅ WhatsApp conectado com sucesso!");
    }
    if (connection === "close") {
      console.log("❌ Conexão encerrada. Tentando reconectar...");
      startSock();
    }
  });
}

startSock();

// =========================
// Rotas da API REST
// =========================

// Enviar vídeo via upload
app.post("/send-video", async (req, res) => {
  if (!sock) return res.status(500).send("❌ WhatsApp não conectado.");

  const { grupo, legenda } = req.body;
  const arquivo = req.files?.file;

  if (!grupo || !arquivo) {
    return res.status(400).send("⚠️ Parâmetros obrigatórios 'grupo' e 'file' ausentes.");
  }

  try {
    const buffer = arquivo.tempFilePath
      ? fs.readFileSync(arquivo.tempFilePath)
      : arquivo.data;

    await sock.sendMessage(grupo, {
      video: buffer,
      mimetype: "video/mp4",
      caption: legenda || ""
    });

    res.send("✅ Vídeo enviado com sucesso!");
  } catch (err) {
    console.error("Erro ao enviar vídeo:", err);
    res.status(500).send("Erro ao enviar vídeo.");
  }
});

// Enviar imagem via URL
app.post("/send-image", async (req, res) => {
  if (!sock) return res.status(500).send("❌ WhatsApp não conectado.");

  const { to, imageUrl, caption } = req.body;

  if (!to || !imageUrl) {
    return res.status(400).send("⚠️ Parâmetros obrigatórios 'to' e 'imageUrl' ausentes.");
  }

  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    await sock.sendMessage(to, {
      image: buffer,
      caption: caption || ""
    });

    res.send("✅ Imagem enviada com sucesso!");
  } catch (err) {
    console.error("Erro ao enviar imagem:", err);
    res.status(500).send("Erro ao enviar imagem.");
  }
});

// Enviar texto simples
app.post("/send-text", async (req, res) => {
  if (!sock) return res.status(500).send("❌ WhatsApp não conectado.");

  const { to, texto } = req.body;

  if (!to || !texto) {
    return res.status(400).send("⚠️ Parâmetros obrigatórios 'to' e 'texto' ausentes.");
  }

  try {
    await sock.sendMessage(to, { text: texto });
    res.send("✅ Texto enviado com sucesso!");
  } catch (err) {
    console.error("Erro ao enviar texto:", err);
    res.status(500).send("Erro ao enviar texto.");
  }
});

// Listar grupos onde o bot participa
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

// Enviar produto da loja com imagem e legenda fixa
app.post("/send-product", async (req, res) => {
  if (!sock) return res.status(500).send("❌ WhatsApp não conectado.");

  const { to, produtoUrl, legendaFixa } = req.body;

  if (!to || !produtoUrl) {
    return res.status(400).send("⚠️ Parâmetros obrigatórios 'to' e 'produtoUrl' ausentes.");
  }

  try {
    // Exemplo: pega os dados do produto via API ou scraping (substituir pela sua implementação)
    const produtoData = await axios.get(produtoUrl); // Exemplo, ajuste conforme necessário
    // Vamos supor que produtoData tenha { imagem, titulo, preco }

    const imagemBuffer = Buffer.from(await axios.get(produtoData.data.imagem, { responseType: "arraybuffer" }).then(res => res.data));

    const mensagem = `${produtoData.data.titulo}\nPreço: ${produtoData.data.preco}\n\n${legendaFixa || ""}`;

    await sock.sendMessage(to, {
      image: imagemBuffer,
      caption: mensagem
    });

    res.send("✅ Produto enviado com sucesso!");
  } catch (err) {
    console.error("Erro ao enviar produto:", err);
    res.status(500).send("Erro ao enviar produto.");
  }
});

// Inicia o servidor Express
app.listen(port, () => {
  console.log(`🟢 Servidor rodando na porta ${port}`);
});
