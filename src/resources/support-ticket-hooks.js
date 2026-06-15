const { sendEmail } = require("../utils/smtp-mailer");

async function sendSupportTicketEmail(ticket) {
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM;

  if (!supportEmail) {
    throw new Error("E-mail de suporte não configurado.");
  }

  await sendEmail({
    replyTo: ticket.email_usuario || undefined,
    to: supportEmail,
    subject: `Novo chamado de suporte - ${ticket.assunto}`,
    text: [
      "Novo chamado de suporte recebido pelo Transporte+.",
      "",
      `Protocolo: ${ticket.id}`,
      `Usuário: ${ticket.nome_usuario || "Não informado"}`,
      `E-mail do usuário: ${ticket.email_usuario || "Não informado"}`,
      `Assunto: ${ticket.assunto}`,
      "",
      "Mensagem:",
      ticket.mensagem,
    ].join("\n"),
  });
}

module.exports = {
  sendSupportTicketEmail,
};
