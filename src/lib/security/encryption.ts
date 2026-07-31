import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
  } from "crypto";
  
  const ALGORITHM = "aes-256-gcm";
  const IV_LENGTH = 12;
  const AUTH_TAG_LENGTH = 16;
  
  function getEncryptionKey() {
    const encodedKey =
      process.env.SUBACCOUNT_ENCRYPTION_KEY;
  
    if (!encodedKey) {
      throw new Error(
        "SUBACCOUNT_ENCRYPTION_KEY não foi configurada.",
      );
    }
  
    const key = Buffer.from(encodedKey, "base64");
  
    if (key.length !== 32) {
      throw new Error(
        "SUBACCOUNT_ENCRYPTION_KEY precisa ter 32 bytes em Base64.",
      );
    }
  
    return key;
  }
  
  export function encryptSecret(value: string) {
    if (!value) {
      throw new Error(
        "Não é possível criptografar um valor vazio.",
      );
    }
  
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
  
    const cipher = createCipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength: AUTH_TAG_LENGTH,
      },
    );
  
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
  
    const authTag = cipher.getAuthTag();
  
    return [
      "v1",
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted.toString("base64"),
    ].join(".");
  }
  
  export function decryptSecret(payload: string) {
    const [version, ivValue, authTagValue, encryptedValue] =
      payload.split(".");
  
    if (
      version !== "v1" ||
      !ivValue ||
      !authTagValue ||
      !encryptedValue
    ) {
      throw new Error(
        "O conteúdo criptografado possui formato inválido.",
      );
    }
  
    const key = getEncryptionKey();
    const iv = Buffer.from(ivValue, "base64");
    const authTag = Buffer.from(
      authTagValue,
      "base64",
    );
    const encrypted = Buffer.from(
      encryptedValue,
      "base64",
    );
  
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      iv,
      {
        authTagLength: AUTH_TAG_LENGTH,
      },
    );
  
    decipher.setAuthTag(authTag);
  
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  
    return decrypted.toString("utf8");
  }