// Importação correta para Baileys v6.6.0
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Configurações essenciais
const app = express();
const PORT = process.env.PORT || 3000;
const authFile = path.join(__dirname, 'auth_info.json');

// CORREÇÃO DEFINITIVA: Sintaxe correta para v6.6.0
const authState = useSingleFileAuthState(authFile);

// Keep-alive para Render
app.get('/', (req, res) => res.send('Bot Ativo'));
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

async function startBot() {
  const sock = makeWASocket({
    auth: authState.state,
    printQRInTerminal: true,
    logger: { level: 'warn' }
  });

  // Eventos
  sock.ev.on('creds.update', authState.saveState);
  
  sock.ev.on('connection.update', (update) => {
    if (update.qr) qrcode.generate(update.qr, { small: true });
    
    if (update.connection === 'close') {
      const shouldReconnect = update.lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) setTimeout(startBot, 5000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (msg?.message?.conversation === '!ping') {
      await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong!' });
    }
  });
}

startBot().catch(err => {
  console.error('Erro inicial:', err);
  process.exit(1);
});
