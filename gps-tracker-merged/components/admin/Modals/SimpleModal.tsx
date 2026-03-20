"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "small" | "medium" | "large";
}

export default function SimpleModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = "medium" 
}: SimpleModalProps) {
  const canUsePortal = typeof document !== "undefined";

  useEffect(() => {
    if (!canUsePortal || !isOpen) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [canUsePortal, isOpen]);

  if (!isOpen || !canUsePortal) return null;

  const sizeClasses = {
    small: "max-w-md",
    medium: "max-w-2xl", 
    large: "max-w-5xl"
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4">
      <div 
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-md"
        onClick={onClose}
      />
      <div 
        className={cn(
          "relative my-auto w-full max-h-[min(100dvh-1rem,92vh)] overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_rgba(15,23,42,0.28)] animate-in fade-in zoom-in duration-200",
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-xl font-black text-gray-900">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 group"
          >
            <X size={20} className="text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
