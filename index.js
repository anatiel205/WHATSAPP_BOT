const {
  default: makeWASocket,
  useSingleFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const authFile = './auth_info.json';
const { state, saveState } = useSingleFileAuthState(authFile);

async function startBot() {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`✅ Usando versão: ${version.join('.')} (última? ${isLatest})`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : 0) !== DisconnectReason.loggedOut;

      console.log('🔌 Desconectado → Reconectar?', shouldReconnect);
      if (shouldReconnect) startBot();
    }

    if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp com sucesso!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

    if (content.toLowerCase() === 'oi') {
      await sock.sendMessage(sender, { text: 'Olá! Como posso te ajudar? 🤖' });
    }

    if (content.toLowerCase() === 'ping') {
      await sock.sendMessage(sender, { text: 'pong 🏓' });
    }
  });
}

startBot();
