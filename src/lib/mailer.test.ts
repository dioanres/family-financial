import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
  createTransport,
}));

const SMTP_ENV = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "user@example.com",
  SMTP_PASS: "secret",
  SMTP_FROM: "Rumadana <user@example.com>",
};

async function loadMailer() {
  vi.resetModules();
  return import("./mailer");
}

describe("escapeHtml", () => {
  it("escapes HTML special characters", async () => {
    const { escapeHtml } = await loadMailer();
    expect(escapeHtml(`<b>"RT" & 'Co'</b>`)).toBe(
      "&lt;b&gt;&quot;RT&quot; &amp; &#39;Co&#39;&lt;/b&gt;"
    );
  });
});

describe("renderEmailTemplate", () => {
  it("uses title as subject and includes message + url in text", async () => {
    const { renderEmailTemplate } = await loadMailer();
    const email = renderEmailTemplate({
      title: "Selamat!",
      message: "Anda menerima arisan",
      url: "https://app.example.com/arisan/1",
    });
    expect(email.subject).toBe("Selamat!");
    expect(email.text).toContain("Anda menerima arisan");
    expect(email.text).toContain("https://app.example.com/arisan/1");
    expect(email.html).toContain('href="https://app.example.com/arisan/1"');
    expect(email.html).toContain("Buka Aplikasi");
  });

  it("escapes user-provided content in html", async () => {
    const { renderEmailTemplate } = await loadMailer();
    const email = renderEmailTemplate({ title: "<script>x</script>", message: "Arisan <b>RT</b> & Co" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("Arisan &lt;b&gt;RT&lt;/b&gt; &amp; Co");
  });

  it("omits the button when url is missing", async () => {
    const { renderEmailTemplate } = await loadMailer();
    const email = renderEmailTemplate({ title: "Info", message: "Pesan" });
    expect(email.html).not.toContain("Buka Aplikasi");
  });
});

describe("sendEmail", () => {
  const original = { ...process.env };

  beforeEach(() => {
    sendMail.mockReset();
    createTransport.mockClear();
    Object.assign(process.env, SMTP_ENV);
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("skips with a warning when SMTP_HOST is empty", async () => {
    delete process.env.SMTP_HOST;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendEmail } = await loadMailer();
    await sendEmail({ to: ["a@x.com"], subject: "s", text: "t", html: "h" });
    expect(createTransport).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("creates transport from env and sends one mail per recipient", async () => {
    sendMail.mockResolvedValue({});
    const { sendEmail } = await loadMailer();
    await sendEmail({ to: ["a@x.com", "b@x.com"], subject: "s", text: "t", html: "h" });

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: { user: "user@example.com", pass: "secret" },
    });
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail).toHaveBeenNthCalledWith(1, {
      from: "Rumadana <user@example.com>",
      to: "a@x.com",
      subject: "s",
      text: "t",
      html: "h",
    });
    expect(sendMail.mock.calls[1][0].to).toBe("b@x.com");
  });

  it("reuses the transport across calls", async () => {
    sendMail.mockResolvedValue({});
    const { sendEmail } = await loadMailer();
    await sendEmail({ to: ["a@x.com"], subject: "s", text: "t", html: "h" });
    await sendEmail({ to: ["b@x.com"], subject: "s", text: "t", html: "h" });
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it("keeps sending after one recipient fails, then throws a summary error", async () => {
    sendMail
      .mockRejectedValueOnce(new Error("550 mailbox unavailable"))
      .mockResolvedValueOnce({});
    const { sendEmail } = await loadMailer();
    await expect(
      sendEmail({ to: ["bad@x.com", "good@x.com"], subject: "s", text: "t", html: "h" })
    ).rejects.toThrow("1/2 email gagal dikirim");
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
