"use client"

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"
import {
    connectStellarWallet,
    disconnectStellarWallet,
    extractWalletError,
    fetchStellarTestnetBalance,
    getSupportedStellarWallets,
    type SupportedStellarWallet,
    type SupportedWalletId,
} from "@/lib/wallet/stellarWallets"

type WalletSession = {
    walletAddress: string
    walletProviderId: SupportedWalletId
}

type WalletContextType = {
    walletAddress: string | null
    walletProviderId: SupportedWalletId | null
    walletBalance: string | null
    supportedWallets: SupportedStellarWallet[]
    isHydrated: boolean
    isConnecting: boolean
    isBalanceLoading: boolean
    walletError: string | null
    shortWalletAddress: string | null
    connectWallet: (walletId: SupportedWalletId) => Promise<void>
    disconnectWallet: () => Promise<void>
    refreshBalance: () => Promise<void>
}

const STORAGE_KEY = "workinggent_wallet_session_v1"

const WalletContext = createContext<WalletContextType | undefined>(undefined)

function readWalletSession(): WalletSession | null {
    if (typeof window === "undefined") return null

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as WalletSession
        if (!parsed.walletAddress || !parsed.walletProviderId) return null
        return parsed
    } catch {
        return null
    }
}

function writeWalletSession(session: WalletSession | null) {
    if (typeof window === "undefined") return

    if (!session) {
        window.localStorage.removeItem(STORAGE_KEY)
        return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function formatWalletAddress(address: string | null) {
    if (!address) return null
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}...${address.slice(-6)}`
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [walletProviderId, setWalletProviderId] = useState<SupportedWalletId | null>(null)
    const [walletBalance, setWalletBalance] = useState<string | null>(null)
    const [supportedWallets, setSupportedWallets] = useState<SupportedStellarWallet[]>([])
    const [isHydrated, setIsHydrated] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [isBalanceLoading, setIsBalanceLoading] = useState(false)
    const [walletError, setWalletError] = useState<string | null>(null)

    useEffect(() => {
        const session = readWalletSession()
        if (session) {
            setWalletAddress(session.walletAddress)
            setWalletProviderId(session.walletProviderId)
        }
        setIsHydrated(true)
    }, [])

    useEffect(() => {
        let cancelled = false

        if (!isHydrated) return

        void getSupportedStellarWallets()
            .then((wallets) => {
                if (!cancelled) setSupportedWallets(wallets)
            })
            .catch(() => {
                if (!cancelled) setSupportedWallets([])
            })

        return () => {
            cancelled = true
        }
    }, [isHydrated])

    const refreshBalance = useCallback(async () => {
        if (!walletAddress) {
            setWalletBalance(null)
            return
        }

        setIsBalanceLoading(true)
        try {
            const balance = await fetchStellarTestnetBalance(walletAddress)
            setWalletBalance(balance)
        } catch (error) {
            console.error("[wallet] Failed to refresh balance", error)
            setWalletBalance(null)
        } finally {
            setIsBalanceLoading(false)
        }
    }, [walletAddress])

    useEffect(() => {
        void refreshBalance()
    }, [refreshBalance])

    const connectWallet = useCallback(async (walletId: SupportedWalletId) => {
        setIsConnecting(true)
        setWalletError(null)

        try {
            const session = await connectStellarWallet(walletId)
            setWalletAddress(session.walletAddress)
            setWalletProviderId(session.walletProviderId)
            writeWalletSession(session)

            const balance = await fetchStellarTestnetBalance(session.walletAddress)
            setWalletBalance(balance)
        } catch (error) {
            const message = extractWalletError(error)
            console.error("[wallet] connectWallet failed", { walletId, error })
            setWalletError(message)
            throw new Error(message)
        } finally {
            setIsConnecting(false)
        }
    }, [])

    const disconnectWallet = useCallback(async () => {
        try {
            await disconnectStellarWallet()
        } catch {
            // Wallet disconnection support varies by provider. Local session cleanup is the important part.
        }

        writeWalletSession(null)
        setWalletAddress(null)
        setWalletProviderId(null)
        setWalletBalance(null)
        setWalletError(null)
    }, [])

    const value = useMemo<WalletContextType>(() => ({
        walletAddress,
        walletProviderId,
        walletBalance,
        supportedWallets,
        isHydrated,
        isConnecting,
        isBalanceLoading,
        walletError,
        shortWalletAddress: formatWalletAddress(walletAddress),
        connectWallet,
        disconnectWallet,
        refreshBalance,
    }), [
        connectWallet,
        disconnectWallet,
        isBalanceLoading,
        isConnecting,
        isHydrated,
        refreshBalance,
        supportedWallets,
        walletAddress,
        walletBalance,
        walletError,
        walletProviderId,
    ])

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWalletContext() {
    const context = useContext(WalletContext)
    if (!context) {
        throw new Error("useWalletContext must be used within a WalletProvider")
    }
    return context
}
