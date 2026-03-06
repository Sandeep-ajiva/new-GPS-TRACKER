"use client";

import PhoneInput from "react-phone-number-input";
import { cn } from "@/lib/utils";

type PhoneInputFieldProps = {
  value: string;
  onChange: (value: string) => void;
  variant?: "light" | "dark";
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
};

export default function PhoneInputField({
  value,
  onChange,
  variant = "light",
  disabled = false,
  placeholder = "Enter phone number",
  required = false,
}: PhoneInputFieldProps) {
  const isDark = variant === "dark";

  // 💡 NORMALIZE: If value is 10 digits without +, prefix with +91 for India
  const normalizedValue = value && !value.startsWith("+") && /^\d{10}$/.test(value)
    ? `+91${value}`
    : value;

  return (
    <PhoneInput
      defaultCountry="IN"
      international
      countryCallingCodeEditable={false}
      value={normalizedValue || undefined}
      onChange={(val) => onChange(val || "")}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        "phone-input w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all",
        isDark
          ? "bg-slate-950/60 border border-slate-800 text-slate-100 focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500/50"
          : "bg-slate-50 border border-slate-200 text-slate-900 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500",
      )}
      numberInputProps={{
        required,
        className: cn(
          "w-full bg-transparent outline-none border-0 text-sm font-bold",
          isDark ? "text-slate-100 placeholder:text-slate-600" : "text-slate-900 placeholder:text-slate-400",
        ),
      }}
    />
  );
}
