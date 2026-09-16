"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Address, AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatUnits } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { CpuChipIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { RequestCard } from "~~/components/chip/RequestCard";
import { type AppState, ago, short, usd } from "~~/components/chip/types";
import { useUsbWallet } from "~~/components/usb/UsbWalletProvider";
import { useScaffoldEventHistory, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { recoveryAbi } from "~~/services/chip/recoveryAbi";
import type { TransferRequest, WalletRequest } from "~~/services/chip/types";
import { notification } from "~~/utils/scaffold-eth";

const POLL_MS = 1500;
const DEFAULT_TO = "atg.eth";
const DEFAULT_AMOUNT = "5";

const Home: NextPage = () => {
  const { targetNetwork } = useTargetNetwork();
  const usb = useUsbWallet();
  const [state, setState] = useState<AppState>();
  const [stateError, setStateError] = useState<string>();
  const [to, setTo] = useState<string>(DEFAULT_TO);
  const typedName = useRef<string>(DEFAULT_TO); // last thing the user typed (an ENS name survives resolution)
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [sending, setSending] = useState(false);
  const [ensName, setEnsName] = useState("hard.atg.eth");
  const [settingName, setSettingName] = useState(false);
  const [callTarget, setCallTarget] = useState("");
  const [callValue, setCallValue] = useState("0");
  const [callData, setCallData] = useState("0x");
  const [executing, setExecuting] = useState(false);
  const [newSignerX, setNewSignerX] = useState("");
  const [newSignerY, setNewSignerY] = useState("");
  const [recoveryWriting, setRecoveryWriting] = useState(false);
  const { address: connectedAddress } = useAccount();
  const chainClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // The chain is the record: every settled send is a TransferExecuted event on ChipAccount, read from
  // the deploy block forward. The app's local queue only knows about rows that can't be onchain yet.
  const { data: events } = useScaffoldEventHistory({
    contractName: "ChipAccount",
    eventName: "TransferExecuted",
    watch: true,
    blockData: true,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setState(json);
      setStateError(undefined);
    } catch (e: any) {
      setStateError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (usb.connected && state)
      usb.pushState({
        vault: state.account.address,
        balance: state.account.balanceFormatted,
        symbol: state.token.symbol,
      });
  }, [usb, state]);

  // With a wallet on USB, that wallet is the device; the server's record may be another (WiFi) wallet.
  const usbControlsVault =
    !!usb.hello?.qx && !!state && usb.hello.qx.toLowerCase() === state.account.signer.qx.toLowerCase();

  const onToChange = (v: string) => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(v)) typedName.current = v; // keep "atg.eth", drop once it resolves
    setTo(v);
  };

  const isAddress = /^0x[0-9a-fA-F]{40}$/.test(to);
  const amountOk = /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0;
  const vaultBalance = Number(state?.account.balanceFormatted ?? 0);
  const overBalance = amountOk && Number(amount) > vaultBalance;
  const canSend = isAddress && amountOk && !overBalance && !sending && !!state;

  /** With a USB wallet plugged in, the browser is the courier: hand the request to the wallet, wait
   *  for A or Y, then post the answer to the app. Returns false when no wallet is connected. */
  const signOnWallet = async (request: WalletRequest): Promise<boolean> => {
    if (!usb.connected) return false;
    let out;
    try {
      out = await usb.sign(request);
    } catch (e: any) {
      await fetch(`/api/requests/${request.id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ by: "website (" + String(e?.message || e).slice(0, 40) + ")" }),
      }).catch(() => {});
      throw e;
    }
    if (out.type === "signature") {
      const res = await fetch(`/api/requests/${request.id}/signature`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ r: out.r, s: out.s }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      notification.success(json.txHash ? "Signed on the wallet and relayed" : "Signed on the wallet: " + json.status);
      return true;
    }
    const why = out.type === "rejected" ? "rejected on the wallet" : out.type === "busy" ? "wallet busy" : out.error;
    await fetch(`/api/requests/${request.id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ by: (usb.hello?.name || "wallet") + ": " + why }),
    }).catch(() => {});
    throw new Error(why);
  };

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const toName = typedName.current && !/^0x/i.test(typedName.current) ? typedName.current : undefined;
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, toName, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      if (!(await signOnWallet(json.request)))
        notification.success(
          state?.device?.paired ? "Sent to the chip for signing" : "Queued — waiting for a paired device",
        );
      await refresh();
    } catch (e: any) {
      notification.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const submitName = async () => {
    setSettingName(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "setName", name: ensName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      if (!(await signOnWallet(json.request))) notification.success("Sent ENS name to the chip for signing");
      await refresh();
    } catch (e: any) {
      notification.error(e.message);
    } finally {
      setSettingName(false);
    }
  };

  const submitCall = async () => {
    setExecuting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "execute", target: callTarget, valueEth: callValue, data: callData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      if (!(await signOnWallet(json.request))) notification.success("Sent contract call to the chip for signing");
      await refresh();
    } catch (e: any) {
      notification.error(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const startRecovery = async () => {
    if (!state?.recovery) return;
    setRecoveryWriting(true);
    try {
      const hash = await writeContractAsync({
        address: state.account.address,
        abi: recoveryAbi,
        functionName: "startRecovery",
        args: [newSignerX as `0x${string}`, newSignerY as `0x${string}`],
      });
      await chainClient?.waitForTransactionReceipt({ hash });
      notification.success("Recovery started. The new key unlocks in 14 days.");
      await refresh();
    } catch (e: any) {
      notification.error(e.shortMessage || e.message);
    } finally {
      setRecoveryWriting(false);
    }
  };

  const finalizeRecovery = async () => {
    if (!state?.recovery) return;
    setRecoveryWriting(true);
    try {
      const hash = await writeContractAsync({
        address: state.account.address,
        abi: recoveryAbi,
        functionName: "finalizeRecovery",
      });
      await chainClient?.waitForTransactionReceipt({ hash });
      notification.success("Recovery finalized. The new hardware key now controls the wallet.");
      await refresh();
    } catch (e: any) {
      notification.error(e.shortMessage || e.message);
    } finally {
      setRecoveryWriting(false);
    }
  };

  const cancelRecovery = async () => {
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "cancelRecovery" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      if (!(await signOnWallet(json.request))) notification.success("Cancellation sent to the Pico.");
      await refresh();
    } catch (e: any) {
      notification.error(e.message);
    }
  };

  const device = state?.device;
  const now = state?.now ?? 0;

  // Merge: onchain events (authoritative) + local in-flight rows (pending / signed / relaying / failed).
  const rows: WalletRequest[] = (() => {
    if (!state) return [];
    const local = state.requests;
    const byTx = new Map(
      local
        .filter((r): r is TransferRequest => r.kind === "transfer" && !!r.txHash)
        .map(r => [r.txHash!.toLowerCase(), r]),
    );
    const onchain: TransferRequest[] = (events ?? []).map(ev => {
      const a = ev.args as {
        token: `0x${string}`;
        to: `0x${string}`;
        amount: bigint;
        nonce: bigint;
        relayer: `0x${string}`;
      };
      const txHash = ev.transactionHash as `0x${string}`;
      const mine = byTx.get(txHash.toLowerCase());
      const block = (ev as { blockData?: { timestamp?: bigint } | null }).blockData;
      const ts = block?.timestamp ? Number(block.timestamp) * 1000 : (mine?.createdAt ?? 0);
      return {
        id: `tx-${txHash}`,
        kind: "transfer",
        chainId: state.chain.id,
        account: state.account.address,
        createdAt: mine?.createdAt ?? ts,
        updatedAt: mine?.updatedAt ?? ts,
        status: "confirmed",
        token: a.token,
        tokenSymbol: state.token.symbol,
        tokenDecimals: state.token.decimals,
        to: a.to,
        toName: mine?.toName,
        amount: a.amount.toString(),
        amountFormatted: formatUnits(a.amount, state.token.decimals),
        nonce: a.nonce.toString(),
        deadline: mine?.deadline ?? 0,
        digest: mine?.digest ?? ("0x" as `0x${string}`),
        signature: mine?.signature,
        signedAt: mine?.signedAt,
        txHash,
        blockNumber: ev.blockNumber?.toString(),
        gasUsed: mine?.gasUsed,
        relayer: a.relayer,
      };
    });
    const seen = new Set(onchain.map(r => r.txHash!.toLowerCase()));
    const inflight = local.filter(r => r.kind === "setName" || !(r.txHash && seen.has(r.txHash.toLowerCase())));
    return [...inflight, ...onchain].sort((a, b) => b.createdAt - a.createdAt);
  })();
  const deviceOnline = !!device && now - device.lastSeen < 45_000;

  return (
    <div className="flex flex-col items-center grow px-4 py-8 gap-8 w-full max-w-5xl mx-auto">
      <header className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-3">
          <CpuChipIcon className="h-9 w-9" />
          Hardware-signed {state?.token.symbol ?? "USDS"}
        </h1>
        <p className="opacity-70 max-w-2xl">
          The private key lives in an ATECC608 secure element. It signs exact EIP-712 actions; a relay pays gas and the
          contract verifies the P-256 signature.
        </p>
      </header>

      {stateError && (
        <div className="alert alert-error text-sm">
          <span>{stateError}</span>
        </div>
      )}

      {state?.recovery && BigInt(state.recovery.executeAfter) > 0n && (
        <div className="alert alert-error w-full">
          <span>Recovery pending until {new Date(Number(state.recovery.executeAfter) * 1000).toLocaleString()}.</span>
          <button className="btn btn-sm" onClick={cancelRecovery}>
            Cancel on Pico
          </button>
        </div>
      )}

      {/* status row */}
      <div className="grid gap-4 md:grid-cols-3 w-full">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-5 gap-2">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-base">Device</h2>
              {usb.connected ? (
                <span className={`badge ${usbControlsVault ? "badge-success" : "badge-error"}`}>
                  {usbControlsVault ? "paired over USB" : "wrong wallet"}
                </span>
              ) : device ? (
                <Link href="/setup" className={`badge ${device.paired ? "badge-success" : "badge-warning"}`}>
                  {device.paired ? "paired" : "not paired"}
                </Link>
              ) : (
                <span className="badge badge-ghost">
                  <span className="loading loading-spinner loading-xs mr-1" />
                  waiting
                </span>
              )}
            </div>
            {usb.connected && usb.hello ? (
              <div className="text-sm space-y-1">
                <div className="font-semibold">
                  {usb.hello.name} <span className="badge badge-ghost badge-sm">USB · {usb.hello.backend}</span>
                </div>
                <div className="font-mono text-xs opacity-70" title={usb.hello.address}>
                  chip{" "}
                  {usb.hello.address ? usb.hello.address.slice(0, 6) + "..." + usb.hello.address.slice(-4) : "no key"}
                </div>
                <div className={`text-xs font-semibold ${usbControlsVault ? "text-success" : "text-error"}`}>
                  {usbControlsVault ? "this wallet controls this vault" : "NOT this vault's signer"}
                </div>
              </div>
            ) : device ? (
              <div className="text-sm space-y-1">
                <div className="font-semibold">
                  {device.name} <span className="badge badge-ghost badge-sm">{device.backend}</span>
                </div>
                {device.qx ? (
                  <div className="font-mono text-xs opacity-70">
                    <div title={device.qx}>qx {short(device.qx, 8)}</div>
                    <div title={device.qy}>qy {short(device.qy, 8)}</div>
                  </div>
                ) : (
                  <div className="text-xs">
                    no key yet —{" "}
                    <Link href="/setup" className="link">
                      set up
                    </Link>
                  </div>
                )}
                <div className={`text-xs ${deviceOnline ? "opacity-60" : "text-warning"}`}>
                  {deviceOnline ? "online" : "not seen"} · last seen {ago(device.lastSeen, now)}
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-70 m-0">
                No signer yet. On the Pi run{" "}
                <code className="text-xs">python3 signer.py run --app &lt;this url&gt;</code> (add{" "}
                <code className="text-xs">--mock</code> without a chip).
              </p>
            )}
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-5 gap-2">
            <h2 className="card-title text-base">Vault (ChipAccount)</h2>
            {state ? (
              <div className="text-sm space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {Number(state.account.balanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                  <span className="font-semibold">{state.token.symbol}</span>
                  <span className="text-xs opacity-60">{usd(state.account.balanceFormatted)}</span>
                </div>
                <Address address={state.account.address} chain={targetNetwork} size="sm" />
                <div className="text-xs opacity-60">
                  nonce {state.account.nonce} · {state.account.signer.paired ? "signer set" : "no signer onchain"}
                </div>
              </div>
            ) : (
              <span className="loading loading-dots" />
            )}
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-5 gap-2">
            <h2 className="card-title text-base">Relay</h2>
            {state ? (
              <div className="text-sm space-y-1">
                <Address address={state.relayer.address} chain={targetNetwork} size="sm" />
                <div className="text-xs opacity-60">
                  {Number(state.relayer.balanceFormatted).toFixed(4)} ETH for gas · {state.chain.name}
                </div>
                <p className="text-xs opacity-60 m-0">Holds no tokens. Can only submit what the chip signed.</p>
              </div>
            ) : (
              <span className="loading loading-dots" />
            )}
          </div>
        </div>
      </div>

      {/* send form */}
      <div className="card bg-base-100 border border-base-300 w-full">
        <div className="card-body p-5 gap-4">
          <h2 className="card-title text-base">Send {state?.token.symbol ?? "USDS"} from the vault</h2>
          <div className="grid gap-4 md:grid-cols-[1fr_200px_auto] md:items-end">
            <label className="form-control w-full">
              <span className="label-text text-xs opacity-70 mb-1">Recipient (address or ENS)</span>
              <AddressInput value={to} onChange={onToChange} placeholder="atg.eth" disabled={sending} />
            </label>
            <label className="form-control w-full">
              <span className="label-text text-xs opacity-70 mb-1">
                Amount {amountOk && <span className="opacity-60">({usd(amount)})</span>}
              </span>
              <div className="join w-full">
                <input
                  className={`input input-bordered join-item w-full tabular-nums ${overBalance ? "input-error" : ""}`}
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  disabled={sending}
                />
                <span className="join-item btn btn-disabled bg-base-200 border-base-300 font-semibold">
                  {state?.token.symbol ?? "USDS"}
                </span>
              </div>
            </label>
            <button className="btn btn-primary md:mb-0" disabled={!canSend} onClick={submit}>
              {sending ? (
                <>
                  <span className="loading loading-spinner loading-sm" /> Sending to chip…
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-4 w-4" /> Send to chip
                </>
              )}
            </button>
          </div>
          <div className="text-xs opacity-60">
            {!isAddress && to && "Resolving recipient…"}
            {overBalance && <span className="text-error">More than the vault holds.</span>}
            {isAddress &&
              !overBalance &&
              "The chip signs the exact transfer. Recovery can only replace the key after 14 days."}
          </div>
        </div>
      </div>

      {/* queue */}
      <section className="w-full space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-lg font-bold m-0">Activity</h2>
          {state && (
            <span className="text-xs opacity-60">
              {events?.length ?? 0} onchain · TransferExecuted events from {short(state.account.address, 6)} on{" "}
              {state.chain.name}
            </span>
          )}
        </div>
        {state && rows.length === 0 && <p className="opacity-60 text-sm">Nothing yet. Send one above.</p>}
        {rows.map(r => (
          <RequestCard key={r.id} r={r} now={now} />
        ))}
      </section>

      <div className="card bg-base-100 border border-base-300 w-full">
        <div className="card-body p-5 gap-4">
          <h2 className="card-title text-base">Set the vault ENS name</h2>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="form-control w-full">
              <span className="label-text text-xs opacity-70 mb-1">Lowercase ENS name</span>
              <input
                className="input input-bordered w-full"
                value={ensName}
                onChange={e => setEnsName(e.target.value.trim().toLowerCase())}
                disabled={settingName}
              />
            </label>
            <button className="btn btn-secondary" disabled={!ensName || settingName || !state} onClick={submitName}>
              {settingName ? <span className="loading loading-spinner loading-sm" /> : "Sign ENS name"}
            </button>
          </div>
          <p className="text-xs opacity-60 m-0">
            First make this name resolve to the vault. This only sets the vault&apos;s reverse/primary name.
          </p>
        </div>
      </div>

      <details className="collapse collapse-arrow bg-base-100 border border-base-300 w-full">
        <summary className="collapse-title font-semibold">Advanced contract call</summary>
        <div className="collapse-content grid gap-4">
          <p className="text-sm text-warning m-0">
            Dangerous: this can move any asset or grant approvals. Verify every field on the Pico.
          </p>
          <div className="grid gap-3 md:grid-cols-[1fr_160px]">
            <label className="form-control">
              <span className="label-text text-xs opacity-70 mb-1">Target address</span>
              <input
                className="input input-bordered font-mono"
                value={callTarget}
                onChange={e => setCallTarget(e.target.value.trim())}
                placeholder="0x…"
                disabled={executing}
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs opacity-70 mb-1">ETH value</span>
              <input
                className="input input-bordered"
                value={callValue}
                onChange={e => setCallValue(e.target.value.replace(/[^\d.]/g, ""))}
                disabled={executing}
              />
            </label>
          </div>
          <label className="form-control">
            <span className="label-text text-xs opacity-70 mb-1">Calldata</span>
            <textarea
              className="textarea textarea-bordered font-mono text-xs min-h-24"
              value={callData}
              onChange={e => setCallData(e.target.value.trim())}
              disabled={executing}
            />
          </label>
          <button
            className="btn btn-warning justify-self-end"
            disabled={
              !/^0x[0-9a-fA-F]{40}$/.test(callTarget) ||
              !/^0x(?:[0-9a-fA-F]{2})*$/.test(callData) ||
              executing ||
              !state
            }
            onClick={submitCall}
          >
            {executing ? <span className="loading loading-spinner loading-sm" /> : "Review on Pico"}
          </button>
        </div>
      </details>

      {state?.recovery && (
        <details className="collapse collapse-arrow bg-base-100 border border-base-300 w-full">
          <summary className="collapse-title font-semibold">Two-week hardware recovery</summary>
          <div className="collapse-content grid gap-4">
            <p className="text-sm m-0">
              Recovery wallet: <Address address={state.recovery.address} chain={targetNetwork} size="sm" />
            </p>
            {BigInt(state.recovery.executeAfter) > 0n ? (
              <div className="grid gap-3">
                <div className="alert alert-warning text-sm">
                  New signer unlocks {new Date(Number(state.recovery.executeAfter) * 1000).toLocaleString()}.
                </div>
                <div className="font-mono text-xs break-all">X: {state.recovery.pendingSignerX}</div>
                <div className="font-mono text-xs break-all">Y: {state.recovery.pendingSignerY}</div>
                <div className="flex gap-3 flex-wrap">
                  <button className="btn btn-error" onClick={cancelRecovery}>
                    Cancel on Pico
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={
                      recoveryWriting ||
                      state.now / 1000 < Number(state.recovery.executeAfter) ||
                      connectedAddress?.toLowerCase() !== state.recovery.address.toLowerCase()
                    }
                    onClick={finalizeRecovery}
                  >
                    Finalize with recovery wallet
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <input
                  className="input input-bordered font-mono text-xs"
                  placeholder="New signer X (bytes32)"
                  value={newSignerX}
                  onChange={e => setNewSignerX(e.target.value.trim())}
                />
                <input
                  className="input input-bordered font-mono text-xs"
                  placeholder="New signer Y (bytes32)"
                  value={newSignerY}
                  onChange={e => setNewSignerY(e.target.value.trim())}
                />
                <button
                  className="btn btn-warning justify-self-end"
                  disabled={
                    recoveryWriting ||
                    !/^0x[0-9a-fA-F]{64}$/.test(newSignerX) ||
                    !/^0x[0-9a-fA-F]{64}$/.test(newSignerY) ||
                    connectedAddress?.toLowerCase() !== state.recovery.address.toLowerCase()
                  }
                  onClick={startRecovery}
                >
                  Start 14-day recovery
                </button>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};

export default Home;
