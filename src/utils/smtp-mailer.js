const net = require("node:net");
const tls = require("node:tls");

const DEFAULT_TIMEOUT_MS = 15000;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const RESEND_API_URL = "https://api.resend.com/emails";

function isBrevoConfigured() {
  return Boolean(
    process.env.BREVO_API_KEY &&
      (process.env.BREVO_FROM_EMAIL || process.env.SMTP_FROM),
  );
}

function isSendGridConfigured() {
  return Boolean(
    process.env.SENDGRID_API_KEY &&
      (process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM),
  );
}

function isResendConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      (process.env.RESEND_FROM || process.env.SMTP_FROM),
  );
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_FROM,
  );
}

function createConnection({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.connect({ host, port }, () => resolve(socket));

    socket.setTimeout(DEFAULT_TIMEOUT_MS);
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("Tempo esgotado ao conectar ao servidor de e-mail."));
    });
  });
}

function createSmtpClient(socket) {
  let buffer = "";
  const waiting = [];

  socket.setEncoding("utf8");
  socket.on("data", (chunk) => {
    buffer += chunk;
    flush();
  });

  function flush() {
    while (waiting.length) {
      const response = tryReadResponse();

      if (!response) {
        return;
      }

      waiting.shift().resolve(response);
    }
  }

  function tryReadResponse() {
    const lines = buffer.split(/\r?\n/);
    const completeIndex = lines.findIndex((line) => /^\d{3} /.test(line));

    if (completeIndex === -1) {
      return null;
    }

    const responseLines = lines.slice(0, completeIndex + 1);
    buffer = lines.slice(completeIndex + 1).join("\r\n");
    const code = Number(responseLines[responseLines.length - 1].slice(0, 3));

    return {
      code,
      message: responseLines.join("\n"),
    };
  }

  function read() {
    return new Promise((resolve, reject) => {
      waiting.push({ resolve, reject });
      flush();
    });
  }

  async function command(value, expectedCodes) {
    socket.write(`${value}\r\n`);
    const response = await read();
    const expected = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];

    if (!expected.includes(response.code)) {
      throw new Error(`Servidor de e-mail recusou o comando: ${response.message}`);
    }

    return response;
  }

  return {
    command,
    read,
  };
}

function encodeBase64(value) {
  return Buffer.from(String(value), "utf8").toString("base64");
}

function escapeDataLines(value) {
  return String(value).replace(/^\./gm, "..");
}

function buildMessage({ from, replyTo, to, subject, text }) {
  return [
    `From: ${from}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
  ].filter(Boolean).join("\r\n");
}

function createRequestSignal() {
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    return AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  }

  return undefined;
}

function parseSender(value) {
  const sender = String(value || "").trim();
  const match = sender.match(/^(.*)<([^>]+)>$/);

  if (!match) {
    return { email: sender };
  }

  return {
    name: match[1].trim().replace(/^"|"$/g, ""),
    email: match[2].trim(),
  };
}

async function readErrorResponse(response) {
  const body = await response.text();
  return body || `${response.status} ${response.statusText}`;
}

async function sendWithSendGrid({ replyTo, to, subject, text }) {
  const from = parseSender(process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM);
  const fromName = process.env.SENDGRID_FROM_NAME || from.name || "Transporte+";
  const payload = {
    personalizations: [
      {
        to: [{ email: to }],
      },
    ],
    from: {
      email: from.email,
      name: fromName,
    },
    subject,
    content: [
      {
        type: "text/plain",
        value: text,
      },
    ],
  };

  if (replyTo) {
    payload.reply_to = { email: replyTo };
  }

  const response = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: createRequestSignal(),
  });

  if (!response.ok) {
    const error = new Error(`SendGrid recusou o e-mail: ${await readErrorResponse(response)}`);
    error.code = `SENDGRID_${response.status}`;
    throw error;
  }
}

async function sendWithBrevo({ replyTo, to, subject, text }) {
  const from = parseSender(process.env.BREVO_FROM_EMAIL || process.env.SMTP_FROM);
  const fromName = process.env.BREVO_FROM_NAME || from.name || "Transporte+";
  const payload = {
    sender: {
      email: from.email,
      name: fromName,
    },
    to: [{ email: to }],
    subject,
    textContent: text,
  };

  if (replyTo) {
    payload.replyTo = { email: replyTo };
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: createRequestSignal(),
  });

  if (!response.ok) {
    const error = new Error(`Brevo recusou o e-mail: ${await readErrorResponse(response)}`);
    error.code = `BREVO_${response.status}`;
    throw error;
  }
}

async function sendWithResend({ replyTo, to, subject, text }) {
  const payload = {
    from: process.env.RESEND_FROM || process.env.SMTP_FROM,
    to: [to],
    subject,
    text,
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "api-transporte-mais/0.1.0",
    },
    body: JSON.stringify(payload),
    signal: createRequestSignal(),
  });

  if (!response.ok) {
    const error = new Error(`Resend recusou o e-mail: ${await readErrorResponse(response)}`);
    error.code = `RESEND_${response.status}`;
    throw error;
  }
}

async function sendEmail({ replyTo, to, subject, text }) {
  if (isBrevoConfigured()) {
    await sendWithBrevo({ replyTo, to, subject, text });
    return;
  }

  if (isSendGridConfigured()) {
    await sendWithSendGrid({ replyTo, to, subject, text });
    return;
  }

  if (isResendConfigured()) {
    await sendWithResend({ replyTo, to, subject, text });
    return;
  }

  if (!isSmtpConfigured()) {
    throw new Error("Envio de e-mail não configurado.");
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const from = process.env.SMTP_FROM;
  let socket = await createConnection({ host, port, secure });
  let client = createSmtpClient(socket);

  await client.read();
  await client.command(`EHLO ${process.env.SMTP_EHLO_DOMAIN || "localhost"}`, 250);

  if (!secure && String(process.env.SMTP_STARTTLS || "true").toLowerCase() !== "false") {
    await client.command("STARTTLS", 220);
    socket = tls.connect({ socket, servername: host });
    client = createSmtpClient(socket);
    await client.command(`EHLO ${process.env.SMTP_EHLO_DOMAIN || "localhost"}`, 250);
  }

  await client.command("AUTH LOGIN", 334);
  await client.command(encodeBase64(process.env.SMTP_USER), 334);
  await client.command(encodeBase64(process.env.SMTP_PASSWORD), 235);
  await client.command(`MAIL FROM:<${from}>`, 250);
  await client.command(`RCPT TO:<${to}>`, [250, 251]);
  await client.command("DATA", 354);
  socket.write(`${escapeDataLines(buildMessage({ from, replyTo, to, subject, text }))}\r\n.\r\n`);
  const dataResponse = await client.read();

  if (dataResponse.code !== 250) {
    throw new Error(`Servidor de e-mail recusou a mensagem: ${dataResponse.message}`);
  }

  await client.command("QUIT", 221);
  socket.end();
}

module.exports = {
  isBrevoConfigured,
  isResendConfigured,
  isSendGridConfigured,
  isSmtpConfigured,
  sendEmail,
};
