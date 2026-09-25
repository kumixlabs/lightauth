import { describe, expect, it } from "bun:test";

import { formatCode, issuerInitial, sanitizeSecret } from "./format";

describe("formatCode", () => {
  it("formats 6-digit code with middle space", () => {
    expect(formatCode("123456")).toBe("123 456");
  });

  it("formats 8-digit code with middle space", () => {
    expect(formatCode("12345678")).toBe("1234 5678");
  });

  it("returns other lengths as-is", () => {
    expect(formatCode("12345")).toBe("12345");
    expect(formatCode("1234567")).toBe("1234567");
    expect(formatCode("")).toBe("");
  });
});

describe("issuerInitial", () => {
  it("extracts first character uppercase", () => {
    expect(issuerInitial("google")).toBe("G");
    expect(issuerInitial("GitHub")).toBe("G");
    expect(issuerInitial("AWS")).toBe("A");
  });

  it("handles empty string gracefully", () => {
    expect(issuerInitial("")).toBe("?");
  });
});

describe("sanitizeSecret", () => {
  it("strips spaces and converts to uppercase", () => {
    expect(sanitizeSecret("jbsw y3dp ehpk 3pxp")).toBe("JBSWY3DPEHPK3PXP");
    expect(sanitizeSecret("  jbsw\ty3dp\n ")).toBe("JBSWY3DP");
  });

  it("keeps already sanitized secret unchanged", () => {
    expect(sanitizeSecret("JBSWY3DPEHPK3PXP")).toBe("JBSWY3DPEHPK3PXP");
  });
});
