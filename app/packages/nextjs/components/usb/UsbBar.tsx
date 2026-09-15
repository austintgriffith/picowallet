"use client";

import { useState } from "react";
import { Blockie } from "./Blockie";
import { useUsbWallet } from "./UsbWalletProvider";
import { notification } from "~~/utils/scaffold-eth";

/** One slim bar under the header: connect the USB wallet (or the emulator's), see who is plugged in. */
export const UsbBar = () => {
  const usb = useUsbWallet();
  const [busy, setBusy] = useState(false);

  const go = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      if (!/cancel|No port selected/i.test(String(e?.message))) notification.error(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const h = usb.hello;
  return (
    <div className="w-full bg-base-200 border-b border-base-300">
      <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold">USB wallet</span>
        {usb.connected && h ? (
          <>
            {h.address && <Blockie seed={h.address} scale={3} />}
            <span className="font-mono text-xs">{h.address ?? "no key yet"}</span>
            <span className="badge badge-ghost badge-sm">
              {h.name} · {h.backend}
              {usb.kind === "emu" && " · emulator"}
            </span>
            {h.hasKey ? (
              <span className="badge badge-success badge-sm">key ready</span>
            ) : (
              <span className="badge badge-warning badge-sm">
                {h.configLocked ? "no key: Setup step 2" : "unlocked: Setup step 1"}
              </span>
            )}
            <button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => go(usb.disconnect)}>
              disconnect
            </button>
          </>
        ) : (
          <>
            <span className="opacity-60">not connected</span>
            <button
              className="btn btn-xs btn-primary"
              disabled={busy || !usb.supported}
              onClick={() => go(usb.connect)}
            >
              {busy ? <span className="loading loading-spinner loading-xs" /> : "connect"}
            </button>
            <button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => go(usb.connectEmu)}>
              connect emulator
            </button>
            {!usb.supported && <span className="text-xs opacity-60">WebSerial needs Chrome or Edge</span>}
          </>
        )}
      </div>
    </div>
  );
};
