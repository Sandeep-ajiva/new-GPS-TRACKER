"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DynamicModalProps } from "@/lib/formTypes";
import { validateWithZod, type FieldErrorMap } from "@/lib/validation";
import {
  ensureOption,
  getCityOptions,
  getCountryOptions,
  getStateOptions,
} from "@/lib/locations";
import PhoneInputField from "@/components/common/PhoneInputField";

export function DynamicModal({
  isOpen,
  onClose,
  title,
  description,
  fields,
  initialData,
  schema,
  onSubmit,
  variant = "light",
  submitLabel = "Submit",
}: DynamicModalProps) {
  const isDark = variant === "dark";
  const [formData, setFormData] = useState<
    Record<string, string | number | boolean | File>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const locationFieldNames = ["country", "state", "city"];

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Initialize empty state based on fields
      const initial: Record<string, string | number | boolean | File> = {};
      fields.forEach((field) => {
        initial[field.name] = field.type === "checkbox" ? false : "";
      });
      setFormData(initial);
    }
    // Only clear error if the modal is opening for the first time
    if (isOpen) {
      setFieldErrors({});
    }
  }, [fields, initialData, isOpen]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const countryValue = String(formData.country || "");
  const stateValue = String(formData.state || "");
  const cityValue = String(formData.city || "");

  const countryOptions = ensureOption(getCountryOptions(), countryValue);
  const stateOptions = ensureOption(getStateOptions(countryValue), stateValue);
  const cityOptions = ensureOption(getCityOptions(countryValue, stateValue), cityValue);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    let val: string | number | boolean | File = value;

    if (type === "checkbox") {
      val = (e.target as HTMLInputElement).checked;
    } else if (type === "file") {
      val = (e.target as HTMLInputElement).files?.[0] as File;
    }

    setApiError(null); // clear error when user resumes typing
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormData((prev) => ({ ...prev, [name]: val }));

    // Optional per-field onChange hook
    const fieldConfig = fields.find((f) => f.name === name);
    if (fieldConfig?.onChange) {
      fieldConfig.onChange(String(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setApiError(null);
    setFieldErrors({});
    try {
      if (schema) {
        const result = validateWithZod(schema, formData);
        if (!result.success) {
          setFieldErrors(result.errors);
          setIsSaving(false);
          return;
        }
      }
      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      // Step 1: Extract nested validation errors (Mongoose style)
      const errorData =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { errors?: Record<string, unknown>; message?: string } }).data
          : undefined;
      if (errorData?.errors && typeof errorData.errors === 'object') {
        try {
          const messages = Object.values(errorData.errors).map((fieldErr) => {
            if (typeof fieldErr === "string") return fieldErr;
            if (
              typeof fieldErr === "object" &&
              fieldErr !== null &&
              "message" in fieldErr &&
              typeof (fieldErr as { message?: string }).message === "string"
            ) {
              return (fieldErr as { message: string }).message;
            }
            return "Invalid value";
          });
          if (messages.length > 0) {
            setApiError(messages.join(" | "));
            return;
          }
        } catch {
          // ignore parsing error
        }
      }

      // Step 2: Fallback to top-level message or plain Error
      const message =
        errorData?.message ||
        (err instanceof Error ? err.message : undefined) ||
        "Something went wrong. Please try again.";
      setApiError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocationChange = (name: string, value: string) => {
    setApiError(null);
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormData((prev) => {
      if (name === "country") {
        return { ...prev, country: value, state: "", city: "" };
      }
      if (name === "state") {
        return { ...prev, state: value, city: "" };
      }
      return { ...prev, city: value };
    });
  };



  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={cn(
          "relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col",
          isDark
            ? "bg-slate-900 border border-slate-800 text-slate-100"
            : "bg-white border border-slate-200 text-slate-900",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 sm:p-6",
            isDark
              ? "border-b border-slate-800 bg-slate-950/40"
              : "border-b border-slate-100 bg-slate-50/50",
          )}
        >
          <div>
            <h2 className="text-xl font-black">{title}</h2>
            {description && (
              <p
                className={cn(
                  "text-sm font-medium mt-1",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-full transition-colors",
              isDark
                ? "hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                : "hover:bg-slate-100 text-slate-400 hover:text-slate-900",
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* ── Inline API error ── */}
          {apiError && (
            <div className={cn(
              "flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium border animate-in fade-in slide-in-from-top-1 duration-200",
              isDark
                ? "bg-red-900/30 border-red-700/40 text-red-300"
                : "bg-red-50 border-red-200 text-red-700"
            )}>
              <span className="mt-0.5 shrink-0 text-rose-500">⚠</span>
              <span className="flex-1">{apiError}</span>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {fields.map((field, index) => {
              const previousSection = index > 0 ? fields[index - 1]?.section : undefined;
              const showSectionHeading = !!field.section && field.section !== previousSection;

              return (
              <React.Fragment key={field.name}>
              {showSectionHeading && (
                <div className="sm:col-span-2 pt-2">
                  <div className={cn("mb-3 border-t pt-4", isDark ? "border-slate-800" : "border-slate-200")}>
                    <p
                      className={cn(
                        "text-[11px] font-black uppercase tracking-[0.28em]",
                        isDark ? "text-slate-300" : "text-slate-700",
                      )}
                    >
                      {field.section}
                    </p>
                  </div>
                </div>
              )}
              <div
                className={cn(field.type === "textarea" ? "sm:col-span-2" : "")}
              >
                <label
                  className={cn(
                    "block text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-2",
                    isDark ? "text-slate-400" : "text-slate-500",
                  )}
                >
                  {field.icon}
                  {field.label}
                  {field.required && <span className="text-rose-500">*</span>}
                </label>

                {locationFieldNames.includes(field.name) ? (
                  <select
                    name={field.name}
                    required={field.required}
                    value={
                      field.name === "country"
                        ? countryValue
                        : field.name === "state"
                          ? stateValue
                          : cityValue
                    }
                    onChange={(e) => handleLocationChange(field.name, e.target.value)}
                    disabled={
                      field.disabled ||
                      (field.name === "state" && !countryValue) ||
                      (field.name === "city" && (!countryValue || !stateValue))
                    }
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-all appearance-none",
                      isDark
                        ? "bg-slate-950/60 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                        : "bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                    )}
                  >
                    <option value="">
                      {field.name === "country"
                        ? "Select country"
                        : field.name === "state"
                          ? "Select state"
                          : "Select city"}
                    </option>
                    {(field.name === "country"
                      ? countryOptions
                      : field.name === "state"
                        ? stateOptions
                        : cityOptions
                    ).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    required={field.required}
                    rows={field.rows || 3}
                    placeholder={field.placeholder}
                    value={(formData[field.name] as string | number) || ""}
                    onChange={handleChange}
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-all resize-none",
                      isDark
                        ? "bg-slate-950/60 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 placeholder:text-slate-600"
                        : "bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400",
                    )}
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.name}
                    required={field.required}
                    value={(formData[field.name] as string | number) || ""}
                    onChange={handleChange}
                    disabled={field.disabled}
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-all appearance-none",
                      isDark
                        ? "bg-slate-950/60 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                        : "bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                    )}
                  >
                    <option value="">Select option</option>
                    {field.groups
                      ? field.groups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </optgroup>
                      ))
                      : field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                ) : field.type === "tel" ? (
                  <PhoneInputField
                    value={String(formData[field.name] || "")}
                    onChange={(val) => {
                      setApiError(null);
                      setFieldErrors((prev) => ({ ...prev, [field.name]: "" }));
                      setFormData((prev) => ({ ...prev, [field.name]: val }));
                    }}
                    variant={variant}
                    disabled={field.disabled}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                ) : field.type === "checkbox" ? (
                  <div className="flex items-center gap-3 py-1">
                    <input
                      type="checkbox"
                      name={field.name}
                      checked={!!formData[field.name]}
                      onChange={handleChange}
                      className={cn(
                        "w-5 h-5 rounded border transition-all cursor-pointer",
                        isDark
                          ? "bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500/20"
                          : "border-slate-300 text-slate-900 focus:ring-blue-500/20",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        isDark ? "text-slate-300" : "text-slate-600",
                      )}
                    >
                      {field.placeholder || "Enable"}
                    </span>
                  </div>
                ) : field.type === "file" ? (
                  <div className="relative">
                    <input
                      type="file"
                      name={field.name}
                      required={field.required}
                      onChange={handleChange}
                      className={cn(
                        "w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-all file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold",
                        isDark
                          ? "bg-slate-950/60 border border-slate-800 text-slate-100 file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
                          : "bg-slate-50 border border-slate-200 text-slate-800 file:bg-white file:border file:border-slate-200 file:text-slate-600 hover:file:bg-slate-100",
                      )}
                    />
                    {formData[field.name] instanceof File && (
                      <p className="mt-1 text-[10px] text-emerald-400 font-bold">
                        Selected: {(formData[field.name] as File).name}
                      </p>
                    )}
                  </div>
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={(formData[field.name] as string | number) || ""}
                    onChange={handleChange}
                    disabled={field.disabled}
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-all",
                      isDark
                        ? "bg-slate-950/60 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 placeholder:text-slate-600"
                        : "bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400",
                    )}
                  />
                )}
                {!fieldErrors[field.name] && field.helperText && (
                  <p className={cn(
                    "mt-1 text-[10px] font-semibold",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )}>
                    {field.helperText}
                  </p>
                )}
                {fieldErrors[field.name] && (
                  <p className={cn(
                    "mt-1 text-[11px] font-semibold",
                    isDark ? "text-rose-300" : "text-rose-600"
                  )}>
                    {fieldErrors[field.name]}
                  </p>
                )}
              </div>
              </React.Fragment>
            )})}
          </div>

          {/* Footer */}
          <div
            className={cn(
              "flex flex-col sm:flex-row gap-3 pt-6 mt-4",
              isDark
                ? "border-t border-slate-800"
                : "border-t border-slate-100",
            )}
          >
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "flex-1 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                isDark
                  ? "bg-slate-950/40 border border-slate-800 text-slate-300 hover:bg-slate-800"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                "flex-1 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg",
                isDark
                  ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/10"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200/40",
              )}
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
