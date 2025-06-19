const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ===== Configurações ===== //
const app = express();
const PORT = process.env.PORT || 3000;
const authFile = path.join(__dirname, 'auth_info.json');
const { state, saveState } = useSingleFileAuthState(authFile);
let sock = null;

// ===== Servidor Keep-Alive (Obrigatório para Render) ===== //
app.get('/', (req, res) => {
  res.status(200).send('🤖 Bot WhatsApp Online!');
});

app.listen(PORT, () => {
  console.log(`Servidor ativo em http://localhost:${PORT}`);
});

// ===== Função Principal ===== //
async function startBot() {
  try {
    console.log('🚀 Iniciando bot...');

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Usaremos qrcode-terminal melhorado
      logger: { level: 'warn' }, // Reduz logs desnecessários
      browser: ['Bot Loja', 'Chrome', '1.0.0']
    });

    // ===== Eventos ===== //
    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Exibe QR Code no terminal
      if (qr) {
        console.log('🔍 Escaneie o QR Code abaixo:');
        qrcode.generate(qr, { small: true });
      }

      // Trata desconexões
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log('⚡ Reconectando em 5s...');
          setTimeout(startBot, 5000);
        } else {
          console.log('❌ Dispositivo deslogado. Remova auth_info.json e reinicie.');
          fs.unlinkSync(authFile);
        }
      }

      // Conexão bem-sucedida
      if (connection === 'open') {
        console.log('✅ Conectado ao WhatsApp!');
      }
    });

    // ===== Tratamento de Mensagens ===== //
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const sender = msg.key.remoteJid;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

      // Comandos
      if (text === '!ping') {
        await sock.sendMessage(sender, { text: '🏓 Pong!' });
      }

      // Adicione outros comandos aqui...
    });

  } catch (err) {
    console.error('❌ Erro crítico:', err);
    process.exit(1);
  }
}

// ===== Inicialização ===== //
startBot();

// ===== Trata encerramento ===== //
process.on('SIGINT', () => {
  console.log('🛑 Encerrando bot...');
  if (sock) sock.end();
  process.exit();
});
