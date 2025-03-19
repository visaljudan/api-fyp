import crypto from "crypto";

// Ensure the secret key is the correct length
const secretKey = "findyourpro@2024 ";
if (!secretKey) {
  throw new Error("JWT_SECRET environment variable is required.");
}

// Generate a 32-byte key for AES-256-CBC (using SHA-256)
const key = crypto.createHash("sha256").update(secretKey).digest();

// Generate a random initialization vector (IV) for each encryption operation
const iv = crypto.randomBytes(16);

// AES-256-CBC encryption and decryption functions

// Encrypt message content
export const encryptContent = (content) => {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(content, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { iv: iv.toString("hex"), content: encrypted };
};

// Decrypt message content
export const decryptContent = (encryptedContent, ivHex) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(ivHex, "hex")
  );
  let decrypted = decipher.update(encryptedContent, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
