"use client";

import { Blockie } from "./Blockie";
import { useUsbWallet } from "./UsbWalletProvider";
import type { ExecuteRequest, SetNameRequest, TransferRequest, WalletRequest } from "~~/services/chip/types";

/** 0x + 40 hex as four lines of ten, the first carrying the 0x: the wallet's layout. */
const addrLines = (a: string) => {
  const h = a.startsWith("0x") ? a.slice(2) : a;
  return ["0x" + h.slice(0, 10), h.slice(10, 20), h.slice(20, 30), h.slice(30, 40)];
};

const shortAddr = (a: string) => (a.length > 14 ? a.slice(0, 6) + ".." + a.slice(-4) : a);

const Summary = ({ r }: { r: WalletRequest }) => {
  if (r.kind === "setName") {
    const n = r as SetNameRequest;
    return (
      <>
        <div className="text-2xl font-bold">SET ENS NAME</div>
        <div className="text-2xl font-bold text-warning font-mono">{n.name.slice(0, 14)}</div>
      </>
    );
  }
  if (r.kind === "cancelRecovery") return <div className="text-2xl font-bold">CANCEL RECOVERY</div>;
  if (r.kind === "execute") {
    const x = r as ExecuteRequest;
    const sel = (x.data || "").slice(0, 10);
    const title = sel === "0xa9059cbb" ? "TOKEN TRANSFER" : sel === "0x095ea7b3" ? "TOKEN APPROVAL" : "GENERAL CALL";
    return (
      <>
        <div className="text-2xl font-bold">{title}</div>
        <div className="text-warning font-mono text-sm">
          {x.valueFormatted} ETH to {shortAddr(x.target)}
        </div>
      </>
    );
  }
  const t = r as TransferRequest;
  const amt = "$" + t.amountFormatted;
  return (
    <>
      <div className={`font-bold font-mono ${amt.length <= 9 ? "text-4xl" : "text-2xl"}`}>{amt}</div>
      <div className="text-sm opacity-60 font-mono">{t.tokenSymbol} to</div>
      <div className="text-2xl font-bold text-warning font-mono">{(t.toName || shortAddr(t.to)).slice(0, 14)}</div>
    </>
  );
};

/** Shown while the wallet has a request on its screen. Same layout, same blockie, same 8 hex: the
 *  person compares this with the wallet before pressing A. */
export const ComparePanel = () => {
  const usb = useUsbWallet();
  if (!usb.pending) return null;

  if ("op" in usb.pending) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="card bg-base-100 w-full max-w-sm">
          <div className="card-body items-center text-center gap-3">
            <div className="badge badge-error badge-lg">PERMANENT</div>
            <h2 className="card-title">
              {usb.pending.op === "lock-config" ? "Lock the config zone" : "Generate a new key"}
            </h2>
            <p className="text-sm opacity-70 m-0">
              The wallet is showing a red warning. Press A on it to do this, Y to cancel.
            </p>
            <button className="btn btn-sm btn-ghost" onClick={usb.cancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const r = usb.pending.request;
  const digest = r.digest.toLowerCase();
  const to =
    r.kind === "transfer" ? (r as TransferRequest).to : r.kind === "execute" ? (r as ExecuteRequest).target : null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="card bg-base-100 w-full max-w-md">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title m-0">Compare with the wallet</h2>
            <span className="badge badge-warning">waiting for A</span>
          </div>
          <p className="text-sm opacity-70 m-0">
            The wallet rebuilt this from the raw fields. It drew its own picture. Same picture, same 8 characters:
            press A on the wallet. Different: press Y.
          </p>

          {/* the wallet's summary screen, 240 px wide like the real one */}
          <div className="mx-auto w-[240px] bg-black text-white rounded-md overflow-hidden font-mono">
            <div className="bg-green-600 text-center font-bold text-xl py-3 tracking-widest">SIGN</div>
            <div className="text-center py-2 space-y-1">
              <Summary r={r} />
            </div>
            <div className="flex items-start gap-3 px-2 pb-3">
              <Blockie seed={digest} scale={8} />
              <div className="text-xs leading-tight pt-1">
                <div className="opacity-60">digest</div>
                <div className="text-xl font-bold tracking-wider">{digest.slice(2, 10)}</div>
                <div className="opacity-60 mt-2">must match the</div>
                <div className="opacity-60">wallet&apos;s</div>
              </div>
            </div>
            <div className="bg-red-600 text-center font-bold text-xl py-3 tracking-widest">REJECT</div>
          </div>

          {to && (
            <div className="text-center font-mono">
              <div className="text-xs opacity-60">{r.kind === "transfer" ? "to" : "target"} (page 2 on the wallet)</div>
              {addrLines(to).map((l, i) => (
                <div key={i} className="text-lg font-bold">
                  {l}
                </div>
              ))}
            </div>
          )}
          <div className="text-xs opacity-60 font-mono text-center">
            chain {r.chainId} · nonce {r.nonce} · deadline {r.deadline}
          </div>
          <div className="text-xs opacity-60 font-mono text-center break-all">{digest}</div>

          <button className="btn btn-sm btn-ghost" onClick={usb.cancel}>
            Cancel on the website
          </button>
        </div>
      </div>
    </div>
  );
};
