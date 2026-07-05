/**
 * Transactional mail. Without SMTP credentials (development) messages are
 * printed to the server console so flows stay fully testable; in
 * production, configure SMTP_* in the environment and plug a provider
 * into `deliver` (the rest of the codebase only calls sendMail).
 */
type Mail = { to: string; subject: string; text: string };

async function deliver(mail: Mail): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(
      `\n[mail] (dev delivery — configure SMTP_* for real sending)\n` +
        `  to:      ${mail.to}\n  subject: ${mail.subject}\n` +
        mail.text
          .split("\n")
          .map((l) => "  | " + l)
          .join("\n") +
        "\n",
    );
    return;
  }
  // Production SMTP integration point (e.g. nodemailer or an HTTP API).
  console.warn("[mail] SMTP configured but no transport wired; message not sent to", mail.to);
}

export async function sendMail(mail: Mail) {
  try {
    await deliver(mail);
  } catch (e) {
    console.error("[mail] delivery failed:", e);
  }
}
