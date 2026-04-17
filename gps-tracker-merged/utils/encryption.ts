import CryptoJS from "crypto-js";

const getEncryptionKey = () => {
    const envKey =
        process.env.NEXT_PUBLIC_ENCRYPTION_KEY ||
        process.env.NEXT_PUBLIC_STORAGE_SECRET;

    if (envKey) {
        return envKey;
    }

    if (typeof window !== "undefined" && window.location?.origin) {
        return `gps-tracker:${window.location.origin}`;
    }

    return "gps-tracker-local";
};

export const encryptPayload = (data: any): string => {
    try {
        const jsonString = JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(jsonString, getEncryptionKey()).toString();
        return encrypted;
    } catch (error) {
        console.error("Encryption failed:", error);
        return "";
    }
};
