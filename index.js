const baileys = require('@whiskeysockets/baileys')
const { default: makeWASocket, fetchLatestBaileysVersion, DisconnectReason } = baileys
const { useSingleFileAuthState } = baileys
const P = require('pino')

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
      console.log('❌ Conexão encerrada. Reconectar?', shouldReconnect)
      if (shouldReconnect) {
        iniciarBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado ao WhatsApp com sucesso!')
    }
  })
}

iniciarBot()
