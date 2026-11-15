import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));

import { getUserAndFamilyId } from "./family";

beforeEach(() => { vi.clearAllMocks(); });

describe("getUserAndFamilyId", () => {
  it("returns userId and familyId when user has a family", async () => {
    findUnique.mockResolvedValue({ id: "user-1", familyMembers: [{ familyId: "fam-1" }] });
    const result = await getUserAndFamilyId("a@b.com");
    expect(result).toEqual({ userId: "user-1", familyId: "fam-1" });
  });

  it("returns userId with null familyId when user has no family", async () => {
    findUnique.mockResolvedValue({ id: "user-1", familyMembers: [] });
    const result = await getUserAndFamilyId("a@b.com");
    expect(result).toEqual({ userId: "user-1", familyId: null });
  });

  it("returns nulls when the user does not exist", async () => {
    findUnique.mockResolvedValue(null);
    const result = await getUserAndFamilyId("missing@b.com");
    expect(result).toEqual({ userId: null, familyId: null });
  });
});
