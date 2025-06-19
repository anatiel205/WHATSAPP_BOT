const { default: makeWASocket, fetchLatestBaileysVersion, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const path = require('path')
const qrcode = require('qrcode-terminal')

// Criar pasta auth se não existir
if (!fs.existsSync('./auth')) fs.mkdirSync('./auth')

const { state, saveState } = useSingleFileAuthState('./auth/session.json')

async function iniciarBot() {
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`🔄 Baileys usando WhatsApp v${version.join('.')}, é a última? ${isLatest}`)

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    logger: P({ level: 'silent' }),
  })

  sock.ev.on('creds.update', saveState)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('❌ Conexão fechada.', shouldReconnect ? 'Reconectando...' : 'Deslogado permanentemente.')
      if (shouldReconnect) iniciarBot()
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado com sucesso!')
    }
  })
}

iniciarBot()
