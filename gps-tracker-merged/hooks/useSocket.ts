"use client";

import { useEffect, useState } from "react";
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";
import { socket } from "@/lib/socket";

export const useSocket = <T>(event: string, callback: (data: T) => void) => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      // Reconnect pe event fire karo — dashboard rooms rejoin kar sake
      socket.emit("__reconnected__");
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(event, callback);

    const token = getSecureItem("token");
    socket.auth = typeof token === "string" && token ? { token } : {};

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(event, callback);
    };
  }, [event, callback]);

  return { isConnected, socket };
};
