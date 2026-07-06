const { sendEmail } = require("../utils/smtp-mailer");
const createHttpError = require("../utils/http-error");

async function send(request, response, next) {
  try {
    const { name, institution, email, subject, message } = request.body || {};
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim();
    const cleanMessage = String(message || "").trim();

    if (!cleanName || !cleanEmail || !cleanMessage) {
      throw createHttpError(400, "Informe nome, e-mail e mensagem antes de enviar.");
    }

    const contactEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM;

    if (!contactEmail) {
      throw createHttpError(503, "Envio de e-mail não configurado.");
    }

    try {
      await sendEmail({
        replyTo: cleanEmail,
        to: contactEmail,
        subject: `Novo contato pelo site - ${String(subject || "Contato").trim() || "Contato"}`,
        text: [
          "Novo contato recebido pelo site do Transporte+.",
          "",
          `Nome: ${cleanName}`,
          `Instituição: ${String(institution || "Não informado").trim() || "Não informado"}`,
          `E-mail: ${cleanEmail}`,
          `Assunto: ${String(subject || "Não informado").trim() || "Não informado"}`,
          "",
          "Mensagem:",
          cleanMessage,
        ].join("\n"),
      });
    } catch (error) {
      console.error("SMTP_SITE_CONTACT_ERROR " + JSON.stringify({
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
      }));
      throw createHttpError(
        503,
        error.message === "Envio de e-mail não configurado."
          ? "Envio de e-mail não configurado."
          : "Não foi possível enviar sua mensagem. Tente novamente.",
      );
    }

    response.json({ data: { enviado: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = { send };
