// The USB wallet link: JSON lines to and from a picowallet (USB.md). Two transports with one shape:
// WebSerialLink talks to a real board through the browser's serial API (Chrome, Edge), EmuLink
// talks to the virtual wallet in the emulator (tools/emu, port 4242) so the whole flow can be tried
// with no hardware. Both hand every reply back by message id.
import type { WalletRequest } from "~~/services/chip/types";

export type Hello = {
  type: "hello";
  name: string;
  fw: string;
  backend: string | null;
  serial?: string | null;
  configLocked?: boolean | null;
  dataLocked?: boolean | null;
  hasKey: boolean;
  qx?: string;
  qy?: string;
  address?: string;
};

export type SignReply =
  | { type: "signature"; r: `0x${string}`; s: `0x${string}`; digest: string }
  | { type: "rejected" }
  | { type: "busy" }
  | { type: "error"; error: string };

/** `setup` locks the config zone if needed and makes the key: one A press, one new wallet. */
export type ProvisionOp = "status" | "lock-config" | "genkey" | "setup";
export type ProvisionReply = { type: "result"; ok: boolean; result?: any; error?: string };

export interface UsbLink {
  readonly kind: "usb" | "emu";
  /** Send one message, resolve with the reply that carries the same id. */
  request<T = any>(msg: Record<string, any>, timeoutMs?: number): Promise<T>;
  /** Lines the wallet printed that were not replies (logs, `ready`). */
  onLine?: (line: string) => void;
  /** Fail every request still waiting (after a cancel: the wallet never answers the sign). */
  cancelPending(reason?: string): void;
  close(): Promise<void>;
}

let seq = 0;
const nextId = () => ++seq;

export function serialSupported() {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/** A real wallet on a USB port, through WebSerial. */
export class WebSerialLink implements UsbLink {
  readonly kind = "usb" as const;
  onLine?: (line: string) => void;
  private port: any;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private waiting = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: any }>();
  private closed = false;

  static async open(): Promise<WebSerialLink> {
    const nav = navigator as any;
    if (!nav.serial) throw new Error("this browser has no WebSerial (use Chrome or Edge)");
    // The Pico's USB serial: Raspberry Pi vendor id 0x2e8a, MicroPython's product id 0x0005. Clones
    // running MicroPython present the same ids; the filter only trims the picker list.
    const port = await nav.serial
      .requestPort({ filters: [{ usbVendorId: 0x2e8a }] })
      .catch(() => nav.serial.requestPort());
    await port.open({ baudRate: 115200 });
    const link = new WebSerialLink();
    link.port = port;
    link.writer = port.writable.getWriter();
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable).catch(() => {});
    link.reader = decoder.readable.getReader();
    link.readLoop();
    return link;
  }

  private async readLoop() {
    let buf = "";
    try {
      while (!this.closed && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        buf += value;
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).replace(/\r$/, "");
          buf = buf.slice(nl + 1);
          this.handle(line);
        }
      }
    } catch {
      // the cable was pulled: everything waiting fails
      for (const w of this.waiting.values()) w.reject(new Error("wallet disconnected"));
      this.waiting.clear();
    }
  }

  private handle(line: string) {
    if (!line.startsWith("{")) {
      if (line.trim()) this.onLine?.(line);
      return;
    }
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      this.onLine?.(line);
      return;
    }
    const w = obj.id !== undefined ? this.waiting.get(obj.id) : undefined;
    if (w) {
      clearTimeout(w.timer);
      this.waiting.delete(obj.id);
      w.resolve(obj);
    } else this.onLine?.(line);
  }

  async request<T = any>(msg: Record<string, any>, timeoutMs = 10_000): Promise<T> {
    if (this.closed || !this.writer) throw new Error("wallet not connected");
    const id = nextId();
    const p = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        reject(new Error("no answer from the wallet"));
      }, timeoutMs);
      this.waiting.set(id, { resolve, reject, timer });
    });
    await this.writer.write(new TextEncoder().encode(JSON.stringify({ id, ...msg }) + "\n"));
    return p;
  }

  cancelPending(reason = "cancelled") {
    for (const w of this.waiting.values()) {
      clearTimeout(w.timer);
      w.reject(new Error(reason));
    }
    this.waiting.clear();
  }

  async close() {
    this.closed = true;
    try {
      await this.reader?.cancel();
    } catch {}
    try {
      this.writer?.releaseLock();
    } catch {}
    try {
      await this.port?.close();
    } catch {}
    for (const w of this.waiting.values()) w.reject(new Error("wallet disconnected"));
    this.waiting.clear();
  }
}

/** The virtual wallet in the emulator: one HTTP call per message, the page relays it to the device. */
export class EmuLink implements UsbLink {
  readonly kind = "emu" as const;
  onLine?: (line: string) => void;
  constructor(private base = "http://localhost:4242") {}

  static async open(base?: string): Promise<EmuLink> {
    const link = new EmuLink(base);
    const st = await fetch(link.base + "/ctl/state")
      .then(r => r.json())
      .catch(() => null);
    if (!st?.ok) throw new Error("no emulator at " + link.base + " (run tools/emu run usbwallet)");
    return link;
  }

  private inflight = new Set<AbortController>();

  async request<T = any>(msg: Record<string, any>, timeoutMs = 10_000): Promise<T> {
    const id = nextId();
    const ac = new AbortController();
    this.inflight.add(ac);
    try {
      const res = await fetch(this.base + "/ctl/cmd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          cmd: "send",
          line: JSON.stringify({ id, ...msg }),
          ms: timeoutMs,
          waitId: id,
          timeout: timeoutMs + 2000,
        }),
      });
      const out = await res.json();
      for (const l of out.lines || []) if (!l.startsWith("{")) this.onLine?.(l);
      if (!out.reply) throw new Error(out.error || "no answer from the emulator wallet");
      return out.reply as T;
    } finally {
      this.inflight.delete(ac);
    }
  }

  cancelPending() {
    for (const ac of this.inflight) ac.abort();
    this.inflight.clear();
  }

  async close() {
    this.cancelPending();
  }
}

// --- the messages ---------------------------------------------------------------------------------

export const hello = (link: UsbLink) => link.request<Hello>({ type: "hello" });
export const ping = (link: UsbLink) => link.request<{ type: "pong" }>({ type: "ping" });
/** Waits for the person: up to two minutes. */
export const sign = (link: UsbLink, request: WalletRequest) =>
  link.request<SignReply>({ type: "sign", request }, 120_000);
export const cancel = (link: UsbLink) => link.request<{ type: "cancelled" }>({ type: "cancel" });
export const provision = (link: UsbLink, op: ProvisionOp) =>
  link.request<ProvisionReply>({ type: "provision", op }, op === "status" ? 10_000 : 120_000);
