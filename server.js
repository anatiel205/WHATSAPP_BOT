// server.js

const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 10000;

// 🔐 Variável global para armazenar o QR code
let qrCodeString = null;

// 📦 Configurações globais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🌐 Servir arquivos estáticos (HTML, CSS, JS, imagens)
app.use(express.static(path.join(__dirname, "public")));

// 🖼️ Rota principal (painel)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔁 API para retornar o QR code em tempo real
app.get("/api/qr", (req, res) => {
  if (!qrCodeString) {
    return res.status(204).json({ qr: null });
  }
  res.json({ qr: qrCodeString });
});

// 🤖 Inicia o bot do WhatsApp
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");

// 🛡️ Autenticação do Baileys
const { state, saveState } = useSingleFileAuthState("./auth.json");

async function startBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ["Ubuntu", "Chrome", "22.04.4"],
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeString = qr;
      console.log("📲 Novo QR gerado.");
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom &&
          lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut);

      console.log("⚠️ Conexão encerrada. Reconectar?", shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === "open") {
      console.log("✅ Bot conectado com sucesso!");
      qrCodeString = null; // Limpa o QR após login
    }
  });

  sock.ev.on("messages.upsert", async (msg) => {
    // Aqui você pode tratar mensagens recebidas (ex: comandos)
  });
}

// 🚀 Inicia o bot
startBot().catch(err => console.error("Erro ao iniciar bot:", err));

// 🟢 Inicia o servidor
app.listen(PORT, () => {
  console.log(`🟢 Painel e servidor rodando na porta ${PORT}`);
});
