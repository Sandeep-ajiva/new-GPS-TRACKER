"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

export const useSocket = <T>(event: string, callback: (data: T) => void) => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(event, callback);

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
