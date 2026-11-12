import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { createMany, findMany, sendOneSignalPush, sendEmail } = vi.hoisted(() => ({
  createMany: vi.fn(),
  findMany: vi.fn(),
  sendOneSignalPush: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { notification: { createMany }, user: { findMany } },
}));
vi.mock("@/lib/onesignal", () => ({ sendOneSignalPush }));
vi.mock("@/lib/mailer", () => ({
  sendEmail,
  renderEmailTemplate: ({ title, message, url }: { title: string; message: string; url?: string }) => ({
    subject: title,
    text: `${message} ${url ?? ""}`.trim(),
    html: `<p>${message}</p>`,
  }),
}));

import { sendNotification, toAbsoluteUrl } from "./notify";

const originalUrl = process.env.NEXTAUTH_URL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_URL = "https://app.example.com";
  createMany.mockResolvedValue({ count: 2 });
  findMany.mockResolvedValue([{ email: "a@x.com" }, { email: "b@x.com" }]);
  sendOneSignalPush.mockResolvedValue(undefined);
  sendEmail.mockResolvedValue(undefined);
});

afterEach(() => {
  process.env.NEXTAUTH_URL = originalUrl;
});

describe("toAbsoluteUrl", () => {
  it("returns undefined for missing url", () => {
    expect(toAbsoluteUrl(undefined)).toBeUndefined();
  });
  it("prefixes relative paths with NEXTAUTH_URL", () => {
    expect(toAbsoluteUrl("/arisan/1")).toBe("https://app.example.com/arisan/1");
  });
  it("keeps absolute urls", () => {
    expect(toAbsoluteUrl("https://other.com/x")).toBe("https://other.com/x");
  });
  it("returns the path unchanged when NEXTAUTH_URL is empty", () => {
    delete process.env.NEXTAUTH_URL;
    expect(toAbsoluteUrl("/arisan/1")).toBe("/arisan/1");
  });
});

describe("sendNotification", () => {
  const params = { userIds: ["u1", "u2"], title: "Selamat!", message: "Anda menang", url: "/arisan/1" };

  it("does nothing for an empty recipient list", async () => {
    await sendNotification({ ...params, userIds: [] });
    expect(createMany).not.toHaveBeenCalled();
    expect(sendOneSignalPush).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("stores in-app notifications with the relative url", async () => {
    await sendNotification(params);
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { userId: "u1", title: "Selamat!", message: "Anda menang", url: "/arisan/1" },
        { userId: "u2", title: "Selamat!", message: "Anda menang", url: "/arisan/1" },
      ],
    });
  });

  it("sends push and email with the absolute url", async () => {
    await sendNotification(params);
    expect(sendOneSignalPush).toHaveBeenCalledWith({
      userIds: ["u1", "u2"],
      heading: "Selamat!",
      content: "Anda menang",
      url: "https://app.example.com/arisan/1",
    });
    expect(findMany).toHaveBeenCalledWith({ where: { id: { in: ["u1", "u2"] } }, select: { email: true } });
    expect(sendEmail).toHaveBeenCalledWith({
      to: ["a@x.com", "b@x.com"],
      subject: "Selamat!",
      text: "Anda menang https://app.example.com/arisan/1",
      html: "<p>Anda menang</p>",
    });
  });

  it("skips users without email and skips sendEmail when nobody has one", async () => {
    findMany.mockResolvedValueOnce([{ email: null }, { email: "b@x.com" }]);
    await sendNotification(params);
    expect(sendEmail.mock.calls[0][0].to).toEqual(["b@x.com"]);

    sendEmail.mockClear();
    findMany.mockResolvedValueOnce([{ email: null }]);
    await sendNotification(params);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still sends push when email fails, and does not throw", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sendEmail.mockRejectedValueOnce(new Error("Invalid login: 535"));
    await expect(sendNotification(params)).resolves.toBeUndefined();
    expect(sendOneSignalPush).toHaveBeenCalled();
    expect(createMany).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("SMTP email failed:", expect.any(Error));
    error.mockRestore();
  });

  it("still sends email when push fails, and does not throw", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    sendOneSignalPush.mockRejectedValueOnce(new Error("OneSignal push gagal (400)"));
    await expect(sendNotification(params)).resolves.toBeUndefined();
    expect(sendEmail).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("OneSignal push failed:", expect.any(Error));
    error.mockRestore();
  });
});
