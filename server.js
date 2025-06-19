const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const fs = require('fs')
const path = require('path')
const qrcode = require('qrcode')

const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, 'public')))

const { state, saveState } = useSingleFileAuthState('./auth/session.json')

async function iniciarBot(io) {
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
  })

  sock.ev.on('creds.update', saveState)

  sock.ev.on('connection.update', (update) => {
    const { qr, connection } = update
    if (qr) {
      qrcode.toDataURL(qr, (err, url) => {
        if (!err) {
          io.emit('qr', url)
        }
      })
    }

    if (connection === 'open') {
      io.emit('ready', '✅ Bot conectado com sucesso!')
    }
  })
}

io.on('connection', () => {
  console.log('🖥️ Novo cliente conectado ao painel')
})

app.get('/', (req, res) => {
  res.render('index')
})

server.listen(PORT, () => {
  console.log(`🚀 Painel rodando em http://localhost:${PORT}`)
  iniciarBot(io)
})
