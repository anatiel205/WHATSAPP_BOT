import makeWASocket, {
  useSingleFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'

// Caminho onde será salva a sessão
const authFile = './auth_info.json'
const { state, saveState } = useSingleFileAuthState(authFile)

async function startBot() {
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`Usando versão do WhatsApp Web: ${version.join('.')}, latest: ${isLatest}`)

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
  })

  // Salvar sessão
  sock.ev.on('creds.update', saveState)

  // Atualização de conexão
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error instanceof Boom
        ? lastDisconnect.error.output.statusCode
        : 0) !== DisconnectReason.loggedOut

      console.log("❌ Conexão encerrada", lastDisconnect?.error?.message || '', "→ Reconectar?", shouldReconnect)

      if (shouldReconnect) startBot()
    }

    if (connection === 'open') {
      console.log("✅ BOT conectado com sucesso ao WhatsApp")
    }
  })

  // Resposta automática
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const sender = msg.key.remoteJid
    const content = msg.message.conversation || msg.message.extendedTextMessage?.text

    if (content?.toLowerCase() === 'oi') {
      await sock.sendMessage(sender, { text: 'Olá! Como posso ajudar?' })
    }

    if (content?.toLowerCase() === 'ping') {
      await sock.sendMessage(sender, { text: 'pong 🏓' })
    }
  })
}

startBot()
