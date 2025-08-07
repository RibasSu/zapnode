require("dotenv").config();
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const fs = require("fs");
const os = require("os");
const express = require("express");
const { v4: uuidv4 } = require("uuid");

// Exported client for integration with other modules
let client = null;

// ===== Configurações =====
const TEMP_DIR = path.resolve(os.tmpdir(), "whatsapp-media");
const MEDIA_SERVER_PORT = 3002; // porta do servidor que vai servir arquivos temporários

// Criar pasta temporária se não existir
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);


// ===== Banco de dados SQLite =====
const db = new sqlite3.Database(path.resolve(__dirname, "../db/contacts.db"));
db.run(`CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT UNIQUE,
  contact_id TEXT,
  conversation_id TEXT
)`);

// ===== Função para enviar mensagem para o Chatwoot =====
async function sendMessageToChatwoot(
  contactId,
  conversationId,
  content,
  localFilePath = null,
  mimeType = null
) {
  try {
    const url = `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;

    // Se houver mídia (arquivo)
    if (localFilePath && fs.existsSync(localFilePath)) {
      const form = new FormData();
      form.append("content", content || "");
      form.append("message_type", "incoming");
      form.append("private", "false");

      const fileStream = fs.createReadStream(localFilePath);
      form.append("attachments[]", fileStream, {
        contentType: mimeType,
        filename: path.basename(localFilePath),
      });

      await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          api_access_token: process.env.CHATWOOT_API_TOKEN,
        },
      });

      console.log("📎 Mídia enviada com sucesso para Chatwoot.");
    } else {
      // Enviar texto puro (sem anexo)
      await axios.post(
        url,
        {
          content,
          message_type: "incoming",
          private: false,
        },
        {
          headers: {
            "Content-Type": "application/json",
            api_access_token: process.env.CHATWOOT_API_TOKEN,
          },
        }
      );

      console.log("💬 Mensagem de texto enviada ao Chatwoot.");
    }
  } catch (e) {
    console.error(
      "❌ Erro ao enviar para Chatwoot:",
      e.response?.data || e.message
    );
  }
}

// ===== Inicializa o cliente WhatsApp =====
function startWhatsApp() {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ["--no-sandbox"] },
  });

  client.on("qr", (qr) => qrcode.generate(qr, { small: true }));

  client.on("ready", () => {
    console.log("Connected to WhatsApp!");
  });

  client.on("message", async (msg) => {
    const rawNumber = msg.from;
    const numberE164 = `+${rawNumber.replace("@c.us", "")}`;

    // Busca contato no banco
    db.get(
      "SELECT * FROM contacts WHERE number = ?",
      [numberE164],
      async (err, row) => {
        if (err) {
          console.error("DB error:", err);
          return;
        }

        // Se não existir contato, cria contato + conversa no Chatwoot
        if (!row) {
          try {
            const contact = await axios.post(
              `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/contacts`,
              {
                inbox_id: process.env.CHATWOOT_INBOX_ID,
                name: numberE164,
                identifier: numberE164,
                phone_number: numberE164,
                custom_attributes: { whatsapp: true },
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  api_access_token: process.env.CHATWOOT_API_TOKEN,
                },
              }
            );

            const contactId = contact.data.payload.contact.id;

            const conversation = await axios.post(
              `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations`,
              {
                source_id: numberE164,
                inbox_id: process.env.CHATWOOT_INBOX_ID,
                contact_id: contactId,
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  api_access_token: process.env.CHATWOOT_API_TOKEN,
                },
              }
            );

            const conversationId = conversation.data.id;

            // Salvar no banco local
            db.run(
              "INSERT INTO contacts (number, contact_id, conversation_id) VALUES (?, ?, ?)",
              [numberE164, contactId, conversationId]
            );

            row = { contact_id: contactId, conversation_id: conversationId };
          } catch (e) {
            console.error("Error creating contact/conversation:", e.message);
            return;
          }
        }

        // Se a mensagem tem mídia
        if (msg.hasMedia) {
          try {
            const media = await msg.downloadMedia();

            // Salvar mídia em arquivo temporário
            const extension = media.mimetype.split("/")[1] || "bin";
            const filename = `${uuidv4()}.${extension}`;
            const filepath = path.resolve(TEMP_DIR, filename);

            fs.writeFileSync(filepath, Buffer.from(media.data, "base64"));

            // URL pública para o arquivo
            const fileUrl = `${process.env.SERVER_PUBLIC_URL || "http://localhost:3001"}/media/${filename}`;

            // Enviar mensagem para o Chatwoot com attachment
            await sendMessageToChatwoot(
              row.contact_id,
              row.conversation_id,
              msg.body || "",
              filepath, // caminho local do arquivo
              media.mimetype
            );
          } catch (e) {
            console.error("Error processing media message:", e.message);
          }
        } else {
          // Mensagem de texto normal
          await sendMessageToChatwoot(
            row.contact_id,
            row.conversation_id,
            msg.body
          );
        }
      }
    );
  });

  client.initialize();
  return client;
}

// ===== Middleware para servir arquivos de mídia =====
const mediaMiddleware = express.static(TEMP_DIR);

// Exporta para uso externo
module.exports = {
  startWhatsApp,
  getClient: () => client,
  MessageMedia,
  mediaMiddleware,
};