// server.js
const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const app = express();
const port = process.env.PORT || 10000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 100 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: "/tmp/"
}));

// 🟣 Serve arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, "public")));

// 🟣 Página principal (painel)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// 🟣 Rotas da API do bot
const whatsappRoutes = require("./routes/whatsapp");
app.use("/api", whatsappRoutes);

// 🟢 Inicia o servidor
app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${port}`);
});
