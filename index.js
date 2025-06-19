// index.js
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const P = require("pino");
const { Boom } = require("@hapi/boom");

// Caminho para salvar sessão (arquivo JSON)
const authFile = "./auth_info.json";

// Pega o estado de autenticação e função para salvar
const { state, saveState } = useSingleFileAuthState(authFile);

async function startBot() {
  try {
    // Busca a versão mais recente do WhatsApp Web para Baileys (melhor compatibilidade)
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`Usando Baileys versão WhatsApp Web: ${version.join(".")} | Última? ${isLatest}`);

    const sock = makeWASocket({
      version,
      logger: P({ level: "silent" }), // ou "debug" para mais logs
      printQRInTerminal: true, // imprime o QR no terminal
      auth: state,
      // Pode usar options adicionais aqui (ex: browser, userAgent)
    });

    // Evento conexão: atualizações da conexão
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("📱 Novo QR code gerado, escaneie para logar!");
      }

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log("⚠️ Conexão fechada:", lastDisconnect?.error?.toString());
        if (shouldReconnect) {
          console.log("🔄 Tentando reconectar...");
          startBot(); // reconecta automaticamente
        } else {
          console.log("❌ Sessão desconectada. Faça login novamente.");
        }
      } else if (connection === "open") {
        console.log("✅ Conectado com sucesso!");
      }
    });

    // Evento de atualização das credenciais da sessão (para salvar no arquivo)
    sock.ev.on("creds.update", saveState);

    // Exemplo simples: responder mensagem de texto "ping" com "pong"
    sock.ev.on("messages.upsert", async (m) => {
      // Somente mensagens novas
      if (m.type !== "notify") return;
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return; // ignorar mensagens enviadas pelo próprio bot

      const from = msg.key.remoteJid;
      const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text;

      if (!messageContent) return;

      if (messageContent.toLowerCase() === "ping") {
        await sock.sendMessage(from, { text: "pong" });
      }
    });

  } catch (error) {
    console.error("Erro ao iniciar o bot:", error);
  }
}

// Start
startBot();
