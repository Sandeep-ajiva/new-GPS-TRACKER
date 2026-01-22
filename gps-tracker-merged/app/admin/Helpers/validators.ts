/**
 * Simple validation helper for Admin forms
 */
export const validators = {
    required: (value: any) => {
        if (value === null || value === undefined || value === "") {
            return "This field is required";
        }
        if (typeof value === "string" && value.trim() === "") {
            return "This field is required";
        }
        return null;
    },
    email: (value: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !regex.test(value)) {
            return "Please enter a valid email address";
        }
        return null;
    },
    minLength: (min: number) => (value: string) => {
        if (value && value.length < min) {
            return `Must be at least ${min} characters long`;
        }
        return null;
    }
};

export const validateForm = (data: any, rules: Record<string, any[]>) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const field in rules) {
        const fieldRules = rules[field];
        for (const rule of fieldRules) {
            let error = null;
            if (typeof rule === "function") {
                error = rule(data[field]);
            } else if ((rule as any).name === "minLength") {
                error = validators.minLength((rule as any).min)(data[field]);
            }

            if (error) {
                errors[field] = error;
                isValid = false;
                break;
            }
        }
    }

    return { isValid, errors };
};
