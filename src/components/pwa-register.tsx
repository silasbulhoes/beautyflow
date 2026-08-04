"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    function registerServiceWorker() {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
        })
        .catch((error: unknown) => {
          console.error(
            "Não foi possível registrar o PWA:",
            error instanceof Error
              ? error.message
              : "Erro desconhecido",
          );
        });
    }

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener(
      "load",
      registerServiceWorker,
    );

    return () => {
      window.removeEventListener(
        "load",
        registerServiceWorker,
      );
    };
  }, []);

  return null;
}