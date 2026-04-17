"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface OverlayProviderProps {
  children: React.ReactNode;
  overlays?: React.ReactNode[];
}

const OVERLAY_ROOT_ID = "overlay-root";

function getOrCreateOverlayRoot() {
  let root = document.getElementById(OVERLAY_ROOT_ID) as HTMLDivElement | null;
  let created = false;

  if (!root) {
    root = document.createElement("div");
    root.id = OVERLAY_ROOT_ID;
    document.body.appendChild(root);
    created = true;
  }

  return { root, created };
}

export function OverlayProvider({ children, overlays = [] }: OverlayProviderProps) {
  const [overlayRoot, setOverlayRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const { root, created } = getOrCreateOverlayRoot();
    queueMicrotask(() => setOverlayRoot(root));

    return () => {
      if (created && root.parentNode) {
        root.parentNode.removeChild(root);
      }
      queueMicrotask(() => setOverlayRoot(null));
    };
  }, []);

  return (
    <>
      {children}
      {overlayRoot
        ? overlays.map((overlay, index) =>
            createPortal(
              <div
                key={index}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
                style={{ zIndex: 9999 }}
              >
                {overlay}
              </div>,
              overlayRoot,
            ),
          )
        : null}
    </>
  );
}

export function useOverlay() {
  const [overlayRoot, setOverlayRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const { root, created } = getOrCreateOverlayRoot();
    queueMicrotask(() => setOverlayRoot(root));

    return () => {
      if (created && root.parentNode) {
        root.parentNode.removeChild(root);
      }
      queueMicrotask(() => setOverlayRoot(null));
    };
  }, []);

  return {
    renderOverlay: (content: React.ReactNode) => {
      if (overlayRoot) {
        return createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
            style={{ zIndex: 9999 }}
          >
            {content}
          </div>,
          overlayRoot,
        );
      }
      return null;
    },
  };
}
