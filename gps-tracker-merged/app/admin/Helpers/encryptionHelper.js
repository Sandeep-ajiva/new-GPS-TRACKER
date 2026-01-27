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
        if (!ciphertext) return null;
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedStr) {
            return null;
        }

        try {
            return JSON.parse(decryptedStr);
        } catch (parseError) {
            // If it's not valid JSON, it might be a raw string from a previous version
            // though encryptData uses JSON.stringify.
            return decryptedStr;
        }
    } catch (e) {
        // This is where "Malformed UTF-8 data" usually happens
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
        const decrypted = decryptData(data);
        if (decrypted === null) {
            // If decryption failed, the data is likely corrupted or from an older version
            // Clear it to prevent further errors and force a clean state
            localStorage.removeItem(key);
            return null;
        }
        return decrypted;
    }
    return null;
};
