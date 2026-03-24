"use client"

import { RefreshCw, Wallet } from "lucide-react"
import { useHasMounted } from "@/lib/useHasMounted"
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton"
import { useWalletContext } from "@/lib/WalletContext"

export default function SettingsPage() {
    const { disconnectWallet, refreshBalance, walletAddress, walletBalance, walletProviderId } = useWalletContext()
    const mounted = useHasMounted()

    return (
        <div className="mx-auto max-w-lg space-y-4">
            <div>
                <h1 className="text-lg font-semibold text-foreground">Settings</h1>
                <p className="text-sm text-foreground-soft">Wallet identity and workspace preferences</p>
            </div>

            <div className="panel p-4">
                {!mounted ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="skeleton h-10 w-10 rounded-lg" />
                            <div className="space-y-1.5">
                                <div className="skeleton h-4 w-28" />
                                <div className="skeleton h-3 w-40" />
                            </div>
                        </div>
                        <div className="skeleton h-10 w-full rounded-lg" />
                    </div>
                ) : walletAddress ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                                <Wallet size={20} />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-foreground">{walletAddress}</div>
                                <div className="text-xs text-foreground-soft">
                                    {walletProviderId} | {walletBalance ?? "0.0000000"} XLM on Stellar Testnet
                                </div>
                            </div>
                        </div>
                        <button onClick={() => void refreshBalance()} className="button-secondary w-full">
                            <RefreshCw size={14} />
                            Refresh Balance
                        </button>
                        <button onClick={() => void disconnectWallet()} className="button-secondary w-full">
                            Disconnect Wallet
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-foreground-soft">
                            No wallet connected. Connect a Stellar testnet wallet to enable agent actions.
                        </p>
                        <ConnectWalletButton className="button-primary w-full" />
                    </div>
                )}
            </div>
        </div>
    )
}
