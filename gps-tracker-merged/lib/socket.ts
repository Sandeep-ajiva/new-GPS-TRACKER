"use client";

import { io } from "socket.io-client";
import { SOCKET_URL } from "@/lib/runtime-config";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 5000,
});
