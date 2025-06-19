import baileys from '@whiskeysockets/baileys'
import makeFetch from './utils/fetchProducts.js'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// Autenticação via arquivo
const { useSingleFileAuthState, default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion } = baileys

const authFile = './auth/session.json'
const { state, saveState } = useSingleFileAuthState(authFile)

// Criar pasta auth se não existir
if (!existsSync('./auth')) mkdirSync('./auth')

async function iniciarBot() {
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`🟢 Usando WhatsApp v${version.join('.')}, é a última? ${isLatest}`)

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' })
  })

  sock.ev.on('creds.update', saveState)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log(`❌ Conexão fechada. Reconectar? ${shouldReconnect}`)
      if (shouldReconnect) iniciarBot()
    } else if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp!')
    }
  })

  // Exemplo: buscar produtos e enviar em breve
  const produtos = await makeFetch('https://loja.menu/eurodistribuidora')
  console.log(`🛍️ ${produtos.length} produtos encontrados`)
}

iniciarBot()
