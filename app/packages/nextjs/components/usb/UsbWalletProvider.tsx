"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { WalletRequest } from "~~/services/chip/types";
import {
  EmuLink,
  type Hello,
  type ProvisionOp,
  type ProvisionReply,
  type SignReply,
  type UsbLink,
  WebSerialLink,
  cancel as cancelMsg,
  hello as helloMsg,
  provision as provisionMsg,
  serialSupported,
  sign as signMsg,
} from "~~/services/usb/link";

/** What the website is waiting on the wallet for right now. */
export type UsbPending = { request: WalletRequest } | { op: ProvisionOp } | null;

type UsbWallet = {
  supported: boolean;
  connected: boolean;
  kind: "usb" | "emu" | null;
  hello: Hello | null;
  pending: UsbPending;
  log: string[];
  connect: () => Promise<void>;
  connectEmu: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<Hello | null>;
  sign: (request: WalletRequest) => Promise<SignReply>;
  cancel: () => Promise<void>;
  provision: (op: ProvisionOp) => Promise<ProvisionReply>;
  /** Tell the wallet the vault's balance (a display hint; it shows it labelled "per the website"). */
  pushState: (s: { vault: string; balance: string; symbol: string }) => void;
};

const Ctx = createContext<UsbWallet | null>(null);

/** Tell the app server who is plugged in, so pairing and the Setup page work as with WiFi. */
async function announce(h: Hello) {
  const chip = {
    configLocked: h.configLocked ?? null,
    dataLocked: h.dataLocked ?? null,
    serial: h.serial ?? null,
    slot: 0,
    hasKey: h.hasKey,
    note: "over USB",
  };
  await fetch("/api/device", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: h.name, backend: h.backend ?? "usb", chip, qx: h.qx, qy: h.qy }),
  }).catch(() => {});
}

export const UsbWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const link = useRef<UsbLink | null>(null);
  const [supported, setSupported] = useState(false);
  const [kind, setKind] = useState<"usb" | "emu" | null>(null);
  const [helloState, setHello] = useState<Hello | null>(null);
  const [pending, setPending] = useState<UsbPending>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => setSupported(serialSupported()), []);

  const addLog = useCallback((line: string) => setLog(l => [...l.slice(-60), line]), []);

  const refresh = useCallback(async () => {
    if (!link.current) return null;
    const h = await helloMsg(link.current);
    setHello(h);
    await announce(h);
    return h;
  }, []);

  const attach = useCallback(
    async (l: UsbLink) => {
      l.onLine = addLog;
      link.current = l;
      setKind(l.kind);
      try {
        await refresh();
      } catch (e) {
        link.current = null;
        setKind(null);
        await l.close();
        throw e;
      }
    },
    [addLog, refresh],
  );

  const disconnect = useCallback(async () => {
    const l = link.current;
    link.current = null;
    setKind(null);
    setHello(null);
    setPending(null);
    if (l) await l.close();
  }, []);

  const connect = useCallback(async () => {
    await disconnect();
    await attach(await WebSerialLink.open());
  }, [attach, disconnect]);

  const connectEmu = useCallback(async () => {
    await disconnect();
    await attach(await EmuLink.open());
  }, [attach, disconnect]);

  const sign = useCallback(async (request: WalletRequest) => {
    if (!link.current) throw new Error("no wallet connected");
    setPending({ request });
    try {
      return await signMsg(link.current, request);
    } finally {
      setPending(null);
    }
  }, []);

  const cancel = useCallback(async () => {
    const l = link.current;
    if (!l) return;
    l.cancelPending("cancelled on the website");
    setPending(null);
    await cancelMsg(l).catch(() => {});
  }, []);

  const lastPushed = useRef("");
  const pushState = useCallback((s: { vault: string; balance: string; symbol: string }) => {
    const l = link.current;
    if (!l) return;
    const key = JSON.stringify(s);
    if (key === lastPushed.current) return;
    lastPushed.current = key;
    l.request({ type: "state", ...s }, 5_000).catch(() => {
      lastPushed.current = "";
    });
  }, []);

  const provision = useCallback(
    async (op: ProvisionOp) => {
      if (!link.current) throw new Error("no wallet connected");
      if (op !== "status") setPending({ op });
      try {
        const out = await provisionMsg(link.current, op);
        if (op !== "status") await refresh().catch(() => {});
        return out;
      } finally {
        setPending(null);
      }
    },
    [refresh],
  );

  // Keep the app server's "last seen" fresh while the wallet is plugged in.
  useEffect(() => {
    if (!kind) return;
    const t = setInterval(() => {
      if (helloState) announce(helloState);
    }, 20_000);
    return () => clearInterval(t);
  }, [kind, helloState]);

  const value: UsbWallet = {
    supported,
    connected: !!kind,
    kind,
    hello: helloState,
    pending,
    log,
    connect,
    connectEmu,
    disconnect,
    refresh,
    sign,
    cancel,
    provision,
    pushState,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useUsbWallet = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUsbWallet outside UsbWalletProvider");
  return v;
};
