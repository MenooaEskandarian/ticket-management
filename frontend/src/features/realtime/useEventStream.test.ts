/** The stream reacts to events and survives the connection dropping. */
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { useEventStream } from "./useEventStream";

/** jsdom ships no EventSource, so stand one up that tests can drive. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  open() {
    this.onopen?.();
  }

  emit(data: string) {
    this.onmessage?.({ data });
  }

  fail() {
    this.onerror?.();
  }
}

function latest() {
  return FakeEventSource.instances.at(-1)!;
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
  server.use(
    http.post("*/api/realtime/token", () =>
      HttpResponse.json({ token: "stream-token-abc", expires_in: 60 }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useEventStream", () => {
  it("carries a freshly minted token rather than the session credentials", async () => {
    renderHook(() => useEventStream("/realtime/queue", vi.fn()));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    expect(latest().url).toBe("/api/realtime/queue?token=stream-token-abc");
  });

  it("runs the handler for every event that arrives", async () => {
    const onEvent = vi.fn();
    renderHook(() => useEventStream("/realtime/tickets/7", onEvent));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    act(() => {
      latest().open();
      latest().emit('{"event":"message.posted"}');
      latest().emit('{"event":"ticket.closed"}');
    });

    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it("reports whether a stream is currently open", async () => {
    const { result } = renderHook(() => useEventStream("/realtime/queue", vi.fn()));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    expect(result.current).toBe(false);

    act(() => latest().open());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("closes the failed socket instead of letting EventSource retry it", async () => {
    renderHook(() => useEventStream("/realtime/queue", vi.fn()));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    const first = latest();
    act(() => first.fail());

    // A retry with the token that just failed would fail the same way.
    expect(first.closed).toBe(true);
  });

  it("opens nothing until it is given a path", async () => {
    renderHook(() => useEventStream(null, vi.fn()));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("closes the stream when the component goes away", async () => {
    const { unmount } = renderHook(() => useEventStream("/realtime/queue", vi.fn()));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    const source = latest();
    unmount();

    expect(source.closed).toBe(true);
  });
});
