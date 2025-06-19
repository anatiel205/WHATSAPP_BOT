const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal'); // Adicionado para melhor visualização do QR
const path = require('path');

// Configuração de autenticação
const authFile = path.join(__dirname, 'auth_info.json');
const { state, saveState } = useSingleFileAuthState(authFile);

// Configuração de reconexão
const reconnectInterval = 5000; // 5 segundos

async function connectToWhatsApp() {
  console.log('🚀 Iniciando bot...');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: console, // Habilita logs detalhados
    browser: ['Bot WhatsApp', 'Chrome', '1.0.0'] // Metadata da conexão
  });

  // Salva credenciais automaticamente
  sock.ev.on('creds.update', saveState);

  // Tratamento de mensagens
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    const msg = messages[0];
    if (!msg.message) return;
    
    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || 
                msg.message.extendedTextMessage?.text ||
                '';

    // Comando simples
    if (text.toLowerCase() === '!ping') {
      await sock.sendMessage(sender, { text: '🏓 pong!' });
    }
  });

  // Tratamento de conexão
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrcode.generate(qr, { small: true }); // Mostra QR no terminal
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Dispositivo deslogado! Delete auth_info.json e escaneie novamente.');
        fs.unlinkSync(authFile); // Remove arquivo de autenticação
      } else {
        console.log(`⚡ Reconectando em ${reconnectInterval/1000}s...`);
        setTimeout(connectToWhatsApp, reconnectInterval);
      }
    } else if (connection === 'open') {
      console.log('✅ Conectado com sucesso ao WhatsApp!');
    }
  });

  return sock;
}

// Inicia o bot com tratamento de erros
connectToWhatsApp()
  .catch(err => {
    console.error('❌ Erro crítico:', err);
    process.exit(1); // Encerra o processo com erro
  });
