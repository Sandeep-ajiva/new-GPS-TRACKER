import CryptoJS from "crypto-js";

const getEncryptionKey = () => {
    const envKey =
        process.env.NEXT_PUBLIC_ENCRYPTION_KEY ||
        process.env.NEXT_PUBLIC_STORAGE_SECRET;

    if (envKey) {
        return envKey;
    }

    // In production, we should NOT have fallbacks for encryption keys
    if (process.env.NODE_ENV === "production") {
        console.error("CRITICAL: Encryption keys (NEXT_PUBLIC_ENCRYPTION_KEY or NEXT_PUBLIC_STORAGE_SECRET) are missing!");
    }

    if (typeof window !== "undefined" && window.location?.origin) {
        return `gps-tracker:${window.location.origin}`;
    }

    return "gps-tracker-dev-key";
};

export const encryptPayload = (data: any): string => {
    try {
        const key = getEncryptionKey();
        if (!key || key === "gps-tracker-dev-key") {
             if (process.env.NODE_ENV === "production") throw new Error("Encryption key missing in production");
        }
        const jsonString = JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
        return encrypted;
    } catch (error) {
        console.error("Encryption failed:", error);
        return "";
    }
};
