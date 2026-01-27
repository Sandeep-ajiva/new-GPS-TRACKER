"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DynamicModalProps } from "@/lib/formTypes";

export function DynamicModal({
  isOpen,
  onClose,
  title,
  description,
  fields,
  initialData,
  onSubmit,
  variant = "light",
  submitLabel = "Submit",
}: DynamicModalProps) {
  const isDark = variant === "dark";
  const [formData, setFormData] = useState<Record<string, string | number | boolean | File>>({});
  const [isSaving, setIsSaving] = useState(false);

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
  }, [initialData, fields, isOpen]);


  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let val: string | number | boolean | File = value;
    
    if (type === "checkbox") {
      val = (e.target as HTMLInputElement).checked;
    } else if (type === "file") {
      val = (e.target as HTMLInputElement).files?.[0] as File;
    }
    
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      // Error is usually handled by the parent via toast
      console.error("Form submit error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={cn(
          "relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200",
          isDark ? "bg-slate-900 border border-slate-800 text-slate-100" : "bg-white border border-slate-200 text-slate-900"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-6",
          isDark ? "border-b border-slate-800 bg-slate-950/40" : "border-b border-slate-100 bg-slate-50/50"
        )}>
          <div>
            <h2 className="text-xl font-black">{title}</h2>
            {description && (
              <p className={cn("text-sm font-medium mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-full transition-colors",
              isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-100" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div 
                key={field.name} 
                className={cn(field.type === "textarea" ? "md:col-span-2" : "")}
              >
                <label className={cn(
                  "block text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-2",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  {field.icon}
                  {field.label}
                  {field.required && <span className="text-rose-500">*</span>}
                </label>

                {field.type === "textarea" ? (
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
                        ? "bg-slate-950/60 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40" 
                        : "bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
                    )}
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.name}
                    required={field.required}
                    value={(formData[field.name] as string | number) || ""}
                    onChange={handleChange}
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-all appearance-none",
                      isDark 
                        ? "bg-slate-950/60 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40" 
                        : "bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
                    )}
                  >
                    <option value="">Select option</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                   <div className="flex items-center gap-3 py-1">
                      <input
                        type="checkbox"
                        name={field.name}
                        checked={!!formData[field.name]}
                        onChange={handleChange}
                        className={cn(
                          "w-5 h-5 rounded border transition-all cursor-pointer",
                          isDark ? "bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500/20" : "border-slate-300 text-slate-900 focus:ring-slate-900/20"
                        )}
                      />
                      <span className={cn("text-xs font-semibold", isDark ? "text-slate-300" : "text-slate-600")}>
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
                          ? "bg-slate-950/60 border border-slate-800 text-slate-100 file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20" 
                          : "bg-slate-50 border border-slate-200 text-slate-900 file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
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
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition-all",
                      isDark 
                        ? "bg-slate-950/60 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40" 
                        : "bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
                    )}
                  />
                )}

              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={cn(
            "flex gap-3 pt-6 mt-4",
            isDark ? "border-t border-slate-800" : "border-t border-slate-100"
          )}>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "flex-1 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                isDark ? "bg-slate-950/40 border border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
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
                  : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10"
              )}
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
