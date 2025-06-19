const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const path = require('path')

const authFile = './auth_info.json'
const { state, saveState } = useSingleFileAuthState(authFile)

async function iniciarBot() {
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`🔄 Baileys usando WhatsApp v${version.join('.')}, é a última? ${isLatest}`)

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state
  })

  sock.ev.on('creds.update', saveState)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('❌ Conexão fechada', { motivo: lastDisconnect?.error, reconectar: shouldReconnect })
      if (shouldReconnect) {
        iniciarBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Conectado com sucesso ao WhatsApp!')
    }
  })
}

iniciarBot()
