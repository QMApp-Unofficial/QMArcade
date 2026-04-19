import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(namespace: string): Socket | null {
  const ref = useRef<Socket | null>(null);
  useEffect(() => {
    const s = io(namespace, { withCredentials: true, transports: ["websocket", "polling"] });
    ref.current = s;
    return () => {
      s.disconnect();
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);
  return ref.current;
}
