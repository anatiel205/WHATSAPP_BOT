const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')

// Estado de autenticação salvo no arquivo JSON
const { state, saveState } = useSingleFileAuthState('./auth_info.json')

async function iniciarBot() {
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`✅ Baileys v${version.join('.')} | Última versão? ${isLatest}`)

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
      console.log('❌ Desconectado. Reconectar? ', shouldReconnect)
      if (shouldReconnect) iniciarBot()
    } else if (connection === 'open') {
      console.log('🎉 Bot conectado com sucesso ao WhatsApp!')
    }
  })
}

iniciarBot()
