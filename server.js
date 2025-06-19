// server.js

const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 10000;

// 1️⃣ Configurações globais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2️⃣ Servir arquivos estáticos (HTML, CSS, JS, imagens)
app.use(express.static(path.join(__dirname, "public")));

// 3️⃣ Rota principal (renderiza o painel)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 4️⃣ Importa lógica principal do bot
require("./index.js");

// 5️⃣ Inicia o servidor
app.listen(PORT, () => {
  console.log(`🟢 Painel e servidor rodando na porta ${PORT}`);
});
