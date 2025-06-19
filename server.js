// server.js

const express = require("express");
const path = require("path");
const multer = require("multer");
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// Upload config
const upload = multer({ dest: "uploads/" });

// Variável global para QR code
let qrCodeString = null;

// Variável global para socket WhatsApp
let sock;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Rota para servir a página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API para retornar QR code atual
app.get("/api/qr", (req, res) => {
  if (!qrCodeString) return res.status(204).json({ qr: null });
  res.json({ qr: qrCodeString });
});

// API para listar grupos (exemplo, você pode adaptar)
app.get("/groups", async (req, res) => {
  try {
    if (!sock) return res.status(500).json({ error: "Socket não conectado" });
    const chats = await sock.groupFetchAllParticipating();
    const groups = Object.values(chats).map(g => ({
      id: g.id,
      subject: g.subject
    }));
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: "Erro ao obter grupos" });
  }
});

// Rota para envio de vídeo MP4 com legenda
app.post("/send-video", upload.single("file"), async (req, res) => {
  try {
    const grupo = req.body.grupo;
    const legenda = req.body.legenda || "";

    if (!grupo || !req.file) {
      return res.status(400).json({ error: "Grupo ou vídeo ausente" });
    }

    const filePath = req.file.path;

    await sock.sendMessage(grupo, {
      video: { path: filePath },
      caption: legenda,
    });

    console.log(`📤 Vídeo enviado para ${grupo}`);

    // Apaga arquivo após envio
    fs.unlink(filePath, (err) => {
      if (err) console.warn("⚠️ Erro ao apagar arquivo:", err);
    });

    res.status(200).json({ message: "Enviado com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao enviar vídeo:", err);
    res.status(500).json({ error: "Falha ao enviar vídeo" });
  }
});

// Autenticação Baileys
const { state, saveState } = useSingleFileAuthState("./auth.json");

async function startBot() {
  sock = makeWASocket({
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
      qrCodeString = null; // limpa QR após login
    }
  });

  sock.ev.on("messages.upsert", async (msg) => {
    // Aqui pode tratar mensagens recebidas se quiser
  });
}

// Inicia bot e servidor
startBot().catch(console.error);

app.listen(PORT, () => {
  console.log(`🟢 Painel e servidor rodando na porta ${PORT}`);
});
