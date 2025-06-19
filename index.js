const baileys = require('@whiskeysockets/baileys')
const makeWASocket = baileys.default
const { useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys
const P = require('pino')

// Autenticação
const { state, saveState } = useSingleFileAuthState('./auth_info.json')

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
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut)
      console.log('❌ Desconectado. Reconectando?', shouldReconnect)
      if (shouldReconnect) {
        iniciarBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp com sucesso!')
    }
  })
}

iniciarBot()
