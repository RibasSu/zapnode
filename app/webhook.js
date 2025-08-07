const express = require("express");
const bodyParser = require("body-parser");
const { getClient } = require("./whatsapp.js");

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

    if (whatsappNumber && messageContent) {
      const chatId = `${whatsappNumber.replace("+", "")}@c.us`;

      try {
        if (client) {
          const chat = await client.getChatById(chatId);

          // Simula "digitando..."
          await chat.sendStateTyping();
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Envia a mensagem
          await client.sendMessage(chatId, messageContent);

          // Limpa o estado "digitando"
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
