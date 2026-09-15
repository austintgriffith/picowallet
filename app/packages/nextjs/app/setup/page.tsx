"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { type AppState, ago, short, usd } from "~~/components/chip/types";
import { useUsbWallet } from "~~/components/usb/UsbWalletProvider";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import type { CommandType } from "~~/services/chip/types";
import { notification } from "~~/utils/scaffold-eth";

const POLL_MS = 1500;

/** Queue a job for the Pi and wait until it reports back. */
async function runCommand(type: CommandType): Promise<any> {
  const res = await fetch("/api/commands", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type }),
  });
  const { command, error } = await res.json();
  if (!res.ok) throw new Error(error || res.statusText);
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    await new Promise(r => setTimeout(r, 1000));
    const s = await fetch("/api/state", { cache: "no-store" }).then(r => r.json());
    const c = (s.commands || []).find((x: any) => x.id === command.id);
    if (c?.status === "done") return c.result;
    if (c?.status === "failed") throw new Error(c.error || "failed");
  }
  throw new Error("no answer from the device (is signer.py running?)");
}

const Step = ({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) => (
  <div className="card bg-base-100 border border-base-300">
    <div className="card-body p-5 gap-3">
      <div className="flex items-center gap-3">
        <span className={`badge badge-lg ${done ? "badge-success" : "badge-ghost"}`}>{done ? "✓" : n}</span>
        <h2 className="card-title text-base m-0">{title}</h2>
      </div>
      {children}
    </div>
  </div>
);

const Setup: NextPage = () => {
  const { targetNetwork } = useTargetNetwork();
  const usb = useUsbWallet();
  const [state, setState] = useState<AppState>();
  const [busy, setBusy] = useState<string>(); // which button is working

  /** Over USB the browser talks to the wallet directly; otherwise queue for the WiFi wallet. */
  const run = async (type: CommandType) => {
    if (!usb.connected) return runCommand(type);
    const out = await usb.provision(type);
    if (!out.ok) throw new Error(out.error || "failed");
    return out.result;
  };
  const [fundAmount, setFundAmount] = useState("10");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setState(json);
    } catch {}
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const device = state?.device;
  const chip = device?.chip;
  const now = state?.now ?? 0;
  const online = usb.connected || (!!device && now - device.lastSeen < 45_000);
  const isMock = device?.backend === "mock";
  const configLocked = isMock ? true : chip?.configLocked === true;
  const hasKey = !!device?.qx;
  const paired = !!device?.paired;
  const funded = Number(state?.account.balanceFormatted ?? 0) > 0;

  const act = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key);
    try {
      const msg = await fn();
      if (msg) notification.success(msg);
      await refresh();
    } catch (e: any) {
      notification.error(e.message);
    } finally {
      setBusy(undefined);
    }
  };

  const post = async (url: string, body?: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || res.statusText);
    return json;
  };

  return (
    <div className="flex flex-col grow px-4 py-8 gap-6 w-full max-w-3xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Setup</h1>
        <p className="opacity-70 m-0">
          Get the chip, the contract and the vault ready. Then go{" "}
          <Link href="/" className="link">
            send
          </Link>
          .
        </p>
      </header>

      {/* device */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-5 gap-2">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base m-0">Device</h2>
            {device ? (
              <span className={`badge ${online ? "badge-success" : "badge-warning"}`}>
                {online ? "online" : "not seen"}
              </span>
            ) : (
              <span className="badge badge-ghost">
                <span className="loading loading-spinner loading-xs mr-1" /> waiting
              </span>
            )}
          </div>
          {device ? (
            <div className="text-sm space-y-1">
              <div>
                <span className="font-semibold">{device.name}</span>{" "}
                <span className="badge badge-ghost badge-sm">{device.backend}</span>
                <span className="opacity-60 text-xs ml-2">last seen {ago(device.lastSeen, now)}</span>
              </div>
              {chip && (
                <div className="font-mono text-xs opacity-70 grid gap-0.5">
                  {chip.serial && <div>serial {chip.serial}</div>}
                  {chip.revision && <div>revision {chip.revision}</div>}
                  <div>
                    config zone {chip.configLocked ? "locked" : "unlocked"} · data zone{" "}
                    {chip.dataLocked ? "locked" : "unlocked"}
                    {chip.slot !== undefined && ` · slot ${chip.slot}`}
                  </div>
                  {chip.note && <div>{chip.note}</div>}
                </div>
              )}
              <button
                className="btn btn-sm btn-ghost"
                disabled={!!busy || !online}
                onClick={() =>
                  act("status", async () => {
                    await run("status");
                    return "status refreshed";
                  })
                }
              >
                {busy === "status" ? <span className="loading loading-spinner loading-xs" /> : "Refresh status"}
              </button>
            </div>
          ) : (
            <p className="text-sm opacity-70 m-0">
              Start the signer on the Pi:{" "}
              <code className="text-xs">python3 signer.py run --app http://&lt;this host&gt;:3000</code>. No chip? Add{" "}
              <code className="text-xs">--mock</code>.
            </p>
          )}
        </div>
      </div>

      {usb.connected && usb.hello && !usb.hello.hasKey && (
        <div className="card bg-base-100 border border-primary">
          <div className="card-body p-5 gap-3">
            <h2 className="card-title text-base m-0">Make the key on the wallet</h2>
            <p className="text-sm opacity-70 m-0">
              One press. The chip locks its settings and makes a key inside itself. Nobody else ever sees that key. The
              wallet shows its new address when it&apos;s done.
            </p>
            <button
              className="btn btn-primary btn-sm w-fit"
              disabled={!!busy}
              onClick={() =>
                act("setup", async () => {
                  const out = await usb.provision("setup");
                  if (!out.ok) throw new Error(out.error || "failed");
                  return "new wallet " + (out.result?.address ?? "");
                })
              }
            >
              {busy === "setup" ? (
                <>
                  <span className="loading loading-spinner loading-xs" /> Waiting for A on the wallet…
                </>
              ) : (
                "Make the key"
              )}
            </button>
          </div>
        </div>
      )}

      <Step n={1} title="Lock the chip's config zone" done={configLocked}>
        <p className="text-sm opacity-70 m-0">
          The ATECC608 refuses to make or use keys until its config zone is locked. One time, permanent, and normal:
          every chip in use is config-locked. Generate the final key before deploying the vault; the vault signer cannot
          be changed afterward.
        </p>
        {isMock ? (
          <p className="text-sm opacity-60 m-0">Mock signer: nothing to lock.</p>
        ) : configLocked ? (
          <p className="text-sm opacity-60 m-0">Already locked.</p>
        ) : (
          <button
            className="btn btn-warning btn-sm w-fit"
            disabled={!!busy || !online}
            onClick={() => {
              if (!confirm("Lock the config zone? This cannot be undone.")) return;
              act("lock", async () => {
                await run("lock-config");
                return "config zone locked";
              });
            }}
          >
            {busy === "lock" ? (
              <>
                <span className="loading loading-spinner loading-xs" /> Locking…
              </>
            ) : (
              "Lock config zone"
            )}
          </button>
        )}
      </Step>

      <Step n={2} title="Generate the signing key" done={hasKey}>
        <p className="text-sm opacity-70 m-0">
          Makes a fresh P-256 key inside the chip (slot 0). The private key never leaves it.
        </p>
        {hasKey && (
          <div className="font-mono text-xs opacity-70">
            <div title={device!.qx}>qx {short(device!.qx, 10)}</div>
            <div title={device!.qy}>qy {short(device!.qy, 10)}</div>
          </div>
        )}
        {hasKey ? (
          <p className="text-sm text-warning m-0">
            Do not regenerate this key after funding a vault unless you complete the 14-day recovery flow first.
          </p>
        ) : (
          <button
            className="btn btn-sm btn-primary w-fit"
            disabled={!!busy || !online || !configLocked}
            onClick={() =>
              act("genkey", async () => {
                await run("genkey");
                return "new key generated";
              })
            }
          >
            {busy === "genkey" ? (
              <>
                <span className="loading loading-spinner loading-xs" /> Generating…
              </>
            ) : (
              "Generate key"
            )}
          </button>
        )}
      </Step>

      <Step n={3} title="Deploy the vault with the initial key" done={paired}>
        <p className="text-sm opacity-70 m-0">
          The recovery wallet can replace the signer only after an uninterrupted 14-day delay. Any valid current-key
          action cancels recovery.
        </p>
        {state && (
          <div className="flex items-center gap-2 text-sm opacity-70">
            Vault <Address address={state.account.address} chain={targetNetwork} size="xs" />
          </div>
        )}
        {device?.qx && (
          <div className="text-xs font-mono bg-base-200 p-2 rounded">
            CHIP_PUBKEY_X={device.qx}
            <br />
            CHIP_PUBKEY_Y={device.qy}
            <br />
            <span className="opacity-60"># put these in packages/foundry/.env, then yarn deploy</span>
          </div>
        )}
        {paired ? (
          <p className="text-sm text-success m-0">The device key matches the current on-chain signer.</p>
        ) : (
          <p className="text-sm text-error m-0">
            Do not fund this vault. Deploy a new ChipAccount with the device key shown above.
          </p>
        )}
      </Step>

      <Step
        n={4}
        title={`Fund the vault${state ? ` (${Number(state.account.balanceFormatted).toLocaleString()} ${state.token.symbol} now)` : ""}`}
        done={funded}
      >
        {state?.chain.isLocal ? (
          <div className="flex items-end gap-2">
            <label className="form-control">
              <span className="label-text text-xs opacity-70 mb-1">Amount {usd(fundAmount || 0)}</span>
              <div className="join">
                <input
                  className="input input-bordered input-sm join-item w-28 tabular-nums"
                  value={fundAmount}
                  onChange={e => setFundAmount(e.target.value.replace(/[^\d.]/g, ""))}
                />
                <span className="join-item btn btn-sm btn-disabled bg-base-200 border-base-300">
                  {state.token.symbol}
                </span>
              </div>
            </label>
            <button
              className="btn btn-primary btn-sm"
              disabled={!!busy || !/^\d+(\.\d+)?$/.test(fundAmount) || Number(fundAmount) <= 0}
              onClick={() =>
                act("fund", async () => {
                  const r = await post("/api/fund", { amount: fundAmount });
                  return `vault now holds ${r.balanceFormatted} ${state.token.symbol}`;
                })
              }
            >
              {busy === "fund" ? (
                <>
                  <span className="loading loading-spinner loading-xs" /> Minting…
                </>
              ) : (
                "Mint into vault"
              )}
            </button>
          </div>
        ) : (
          <p className="text-sm opacity-70 m-0">
            Send {state?.token.symbol ?? "USDS"} to the vault address above from any wallet.
          </p>
        )}
      </Step>

      <div className="flex items-center gap-3">
        <Link href="/" className={`btn ${configLocked && hasKey && paired && funded ? "btn-primary" : "btn-ghost"}`}>
          Go send →
        </Link>
        {!(configLocked && hasKey && paired && funded) && (
          <span className="text-sm opacity-60">finish the steps first</span>
        )}
      </div>
    </div>
  );
};

export default Setup;
