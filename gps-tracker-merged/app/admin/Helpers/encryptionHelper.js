import CryptoJS from "crypto-js";

const LEGACY_SECRET_KEYS = [
    "admin_security_key_2026",
    "fallback_dev_secret_key_12345",
].filter(Boolean);

const getPrimarySecretKey = () => {
    const envKey =
        process.env.NEXT_PUBLIC_STORAGE_SECRET ||
        process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

    if (envKey) {
        return envKey;
    }

    if (typeof window !== "undefined" && window.location?.origin) {
        return `gps-tracker:${window.location.origin}`;
    }

    return "gps-tracker-local";
};

const getCandidateSecretKeys = () => {
    return [...new Set([getPrimarySecretKey(), ...LEGACY_SECRET_KEYS].filter(Boolean))];
};

const canUseStorage = () => {
    return (
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined" &&
        typeof window.localStorage.getItem === "function" &&
        typeof window.localStorage.setItem === "function" &&
        typeof window.localStorage.removeItem === "function"
    );
};

/**
 * Helper to encrypt sensitive data before saving to localStorage
 */
export const encryptData = (data) => {
    try {
        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), getPrimarySecretKey()).toString();
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
        for (const secretKey of getCandidateSecretKeys()) {
            const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
            const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);

            if (!decryptedStr) {
                continue;
            }

            try {
                return JSON.parse(decryptedStr);
            } catch (_) {
                return decryptedStr;
            }
        }

        return null;
    } catch (e) {
        // This is where "Malformed UTF-8 data" usually happens
        return null;
    }
};

/**
 * Save encrypted data to localStorage
 */
export const saveSecureItem = (key, data) => {
    if (!canUseStorage()) return;
    const encrypted = encryptData(data);
    if (encrypted) {
        window.localStorage.setItem(key, encrypted);
    }
};

/**
 * Get decrypted data from localStorage
 */
export const getSecureItem = (key) => {
    if (!canUseStorage()) return null;

    const data = window.localStorage.getItem(key);
    if (data) {
        const decrypted = decryptData(data);
        if (decrypted === null) {
            // If decryption failed, the data is likely corrupted or from an older version
            // Clear it to prevent further errors and force a clean state
            window.localStorage.removeItem(key);
            return null;
        }
        return decrypted;
    }
    return null;
};
