import CryptoJS from "crypto-js";

const SECRET_KEY = "admin_security_key_2026";

/**
 * Helper to encrypt sensitive data before saving to localStorage
 */
export const encryptData = (data) => {
    try {
        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
        return ciphertext;
    } catch (e) {
        console.error("Encryption failed", e);
        return null;
    }
};

/**
 * Helper to decrypt data from localStorage
 */
export const decryptData = (ciphertext) => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        return decryptedData;
    } catch (e) {
        console.error("Decryption failed", e);
        return null;
    }
};

/**
 * Save encrypted data to localStorage
 */
export const saveSecureItem = (key, data) => {
    const encrypted = encryptData(data);
    if (encrypted) {
        localStorage.setItem(key, encrypted);
    }
};

/**
 * Get decrypted data from localStorage
 */
export const getSecureItem = (key) => {
    const data = localStorage.getItem(key);
    if (data) {
        return decryptData(data);
    }
    return null;
};
