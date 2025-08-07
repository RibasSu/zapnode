require("dotenv").config();
const express = require("express");
const whatsapp = require("./whatsapp.js");
const webhookApp = require("./webhook.js");

const PORT = process.env.PORT || 3000;

const app = express();

// Rota para servir arquivos de mídia do WhatsApp
app.use("/media", whatsapp.mediaMiddleware);

// Start WhatsApp client
whatsapp.startWhatsApp();

// Mount webhook endpoint
app.use("/", webhookApp);

// Start Express server
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});