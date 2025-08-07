const express = require("express");
const bodyParser = require("body-parser");
const { getClient, MessageMedia } = require("./whatsapp.js");

const app = express();
app.use(bodyParser.json());

app.post("/webhook", async (req, res) => {
  console.log("Received webhook:", req.body);
  const payload = req.body;
  const client = getClient();

  // Verifica se o payload contém o tipo de mensagem esperado
  if (payload.message_type === "outgoing" && payload.private !== true) {
    const conversation = payload.conversation;
    const whatsappNumber =
      conversation.meta?.sender?.phone_number ||
      conversation.meta?.sender?.identifier;
    const messageContent = payload.content;

    if (whatsappNumber) {
      const chatId = `${whatsappNumber.replace("+", "")}@c.us`;

      try {
        if (client) {
          const chat = await client.getChatById(chatId);
          await chat.sendStateTyping();
          await new Promise((resolve) => setTimeout(resolve, 2000));

          if (payload.attachments && payload.attachments.length > 0) {
            // Enviar o primeiro anexo suportado (áudio, vídeo, imagem, documento, etc.)
            let agentName = payload?.private_metadata?.assignee_name || payload?.assignee?.name || payload?.sender?.name || "Agente";
            let messageBody = payload.content ? `*${agentName}*: ${payload.content}` : `*${agentName}*`;
            const supportedAttachment = payload.attachments.find(
              (a) => ["image", "audio", "video", "document", "gif"].includes(a.file_type)
            );
            if (supportedAttachment) {
              const mediaUrl = supportedAttachment.data_url;
              const media = await MessageMedia.fromUrl(mediaUrl);
              const options = {};
              if (["image", "video", "gif"].includes(supportedAttachment.file_type)) {
                options.caption = messageBody;
              }
              await client.sendMessage(chatId, media, options);
            } else {
              await client.sendMessage(chatId, messageBody);
            }
          } else if (messageContent) {
            let agentName = payload?.private_metadata?.assignee_name || payload?.assignee?.name || payload?.sender?.name || "Agente";
            let messageBody = `*${agentName}*: ${messageContent}`;
            await client.sendMessage(chatId, messageBody);
          }

          await chat.clearState();
        } else {
          console.error("WhatsApp client is not ready yet.");
        }
      } catch (e) {
        console.error("Error sending message to WhatsApp:", e.message);
      }
    }

    return res.sendStatus(200);
  }

  // mensagens automáticas quando conversa for finalizada ou reaberta
  if (
    payload.event === "conversation_status_changed" &&
    payload.contact_inbox?.source_id &&
    client
  ) {
    const chatId = `${payload.contact_inbox.source_id.replace("+", "")}@c.us`;
    let statusMessage = null;

    if (payload.status === "resolved") {
      statusMessage = "✅ Atendimento finalizado. Obrigado!";
    } else if (payload.status === "open" && payload.meta?.assignee?.name) {
      statusMessage = `👤 O agente *${payload.meta.assignee.name}* iniciou o atendimento.`;
    }

    if (statusMessage) {
      try {
        const chat = await client.getChatById(chatId);
        await chat.sendStateTyping();
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await client.sendMessage(chatId, statusMessage);
        await chat.clearState();
      } catch (e) {
        console.error("Erro ao enviar mensagem de status:", e.message);
      }
    }

    return res.sendStatus(200);
  }

  // Outros eventos ignorados
  return res.sendStatus(200);
});

app.get("/webhook", (req, res) => {
  res.send("Webhook is active");
});

module.exports = app;