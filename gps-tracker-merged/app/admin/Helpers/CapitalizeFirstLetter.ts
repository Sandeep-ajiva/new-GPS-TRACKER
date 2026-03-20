export const capitalizeFirstLetter = (input: any) => {
    if (!input || typeof input !== 'string') return "";
    const str = String(input);
    return str.charAt(0).toUpperCase() + str.slice(1);
};
