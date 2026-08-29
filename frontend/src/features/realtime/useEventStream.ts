import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const MAX_BACKOFF_MS = 30_000;

interface StreamToken {
  token: string;
  expires_in: number;
}

/**
 * Subscribe to a server-sent event stream and run `onEvent` for each message.
 *
 * EventSource cannot send an Authorization header, so each connection first
 * trades the session's credentials for a short-lived stream token and carries
 * that in the URL instead of the long-lived one.
 *
 * Reconnection is handled here rather than left to EventSource: its own retry
 * would reuse a token that has since expired, so the socket is closed and a
 * fresh token fetched on each attempt, backing off as failures repeat.
 *
 * Returns whether a stream is currently open, for a "live" indicator. Nothing
 * here is load-bearing -- if it never connects, the page still works.
 */
export function useEventStream(path: string | null, onEvent: () => void) {
  const [connected, setConnected] = useState(false);

  // Kept in a ref so a new callback identity does not tear down the stream.
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!path) return;

    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let stopped = false;

    function retry() {
      if (stopped) return;
      const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
      attempt += 1;
      timer = setTimeout(connect, delay);
    }

    async function connect() {
      if (stopped) return;

      try {
        const { data } = await api.post<StreamToken>("/realtime/token");
        if (stopped) return;

        source = new EventSource(`/api${path}?token=${encodeURIComponent(data.token)}`);

        source.onopen = () => {
          attempt = 0;
          setConnected(true);
        };
        source.onmessage = () => handler.current();
        source.onerror = () => {
          // Close first: otherwise EventSource retries on its own with the
          // token that just failed.
          source?.close();
          source = null;
          setConnected(false);
          retry();
        };
      } catch {
        setConnected(false);
        retry();
      }
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(timer);
      source?.close();
      setConnected(false);
    };
  }, [path]);

  return connected;
}
