"use client"

import {
    Account,
    Address,
    BASE_FEE,
    nativeToScVal,
    Operation,
    rpc,
    scValToNative,
    TransactionBuilder,
    xdr,
} from "@stellar/stellar-sdk"
import { SOROBAN_CONFIG, sorobanConfigured } from "@/lib/soroban/config"
import { signSorobanTransaction } from "@/lib/soroban/walletSigner"
import type { SupportedWalletId } from "@/lib/wallet/stellarWallets"
import type { AgentType, OnChainTaskStatus } from "@/types/tasks"

export type SorobanTaskLifecycleParams = {
    walletAddress: string
    walletProviderId: string | null
    onChainTaskId: bigint
    rewardStroops: bigint
    agentType: AgentType
}

export type SorobanTaskReceipt = {
    contractId: string
    onChainTaskId: string
    rewardStroops: string
    txHash: string
    onChainStatus: OnChainTaskStatus
}

function getRpcServer() {
    return new rpc.Server(SOROBAN_CONFIG.rpcUrl)
}

function requireSorobanSupport(walletProviderId: string | null) {
    if (!sorobanConfigured()) {
        throw new Error("Soroban is not configured. Add the contract and RPC environment variables first.")
    }

    if (!walletProviderId || !["freighter", "xbull", "albedo"].includes(walletProviderId)) {
        throw new Error("Use Freighter, xBull, or Albedo to sign Soroban task transactions.")
    }
}

function getNetworkPassphrase() {
    return SOROBAN_CONFIG.networkPassphrase
}

function symbolScVal(value: string) {
    return xdr.ScVal.scvSymbol(value)
}

async function submitContractInvocation(params: {
    walletAddress: string
    walletProviderId: SupportedWalletId | null
    functionName: string
    args: xdr.ScVal[]
}) {
    const server = getRpcServer()
    const sourceAccount = await server.getAccount(params.walletAddress)

    const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: getNetworkPassphrase(),
    })
        .addOperation(
            Operation.invokeContractFunction({
                contract: SOROBAN_CONFIG.contractId,
                function: params.functionName,
                args: params.args,
            })
        )
        .setTimeout(60)
        .build()

    const prepared = await server.prepareTransaction(tx)
    const signedTx = await signSorobanTransaction({
        walletType: params.walletProviderId,
        walletAddress: params.walletAddress,
        transactionXdr: prepared.toXDR(),
        networkPassphrase: getNetworkPassphrase(),
    })
    const sendResult = await server.sendTransaction(signedTx)

    const status = sendResult.status as string
    if (status !== "PENDING" && status !== "SUCCESS") {
        throw new Error(sendResult.errorResult?.toString() ?? "Soroban transaction submission failed")
    }

    const txHash = sendResult.hash

    // Soroban testnet usually confirms in 2-5s.
    // Poll quickly: 400ms first, then 600ms intervals, max ~6s total.
    const pollDelays = [400, 600, 600, 600, 600, 600, 800, 800, 1000, 1000]
    for (const delay of pollDelays) {
        await new Promise((resolve) => window.setTimeout(resolve, delay))
        const txStatus = await server.getTransaction(txHash)
        if (txStatus.status === "SUCCESS") {
            return {
                txHash,
                resultXdr: txStatus.returnValue,
            }
        }

        if (txStatus.status === "FAILED") {
            throw new Error("Soroban transaction failed on-chain")
        }
    }

    throw new Error("Timed out waiting for Soroban transaction confirmation")
}

export function rewardXlmToStroops(rewardXlm: string) {
    const trimmed = rewardXlm.trim()
    if (!trimmed || Number(trimmed) <= 0) {
        throw new Error("Reward must be greater than 0 XLM")
    }

    const [whole = "0", fraction = ""] = trimmed.split(".")
    const normalizedFraction = `${fraction}0000000`.slice(0, 7)
    return BigInt(whole) * 10_000_000n + BigInt(normalizedFraction)
}

export async function createEscrowedTask(params: SorobanTaskLifecycleParams): Promise<SorobanTaskReceipt> {
    requireSorobanSupport(params.walletProviderId)

    const receipt = await submitContractInvocation({
        walletAddress: params.walletAddress,
        walletProviderId: params.walletProviderId as SupportedWalletId | null,
        functionName: "create_task",
        args: [
            nativeToScVal(params.onChainTaskId, { type: "u64" }),
            new Address(params.walletAddress).toScVal(),
            symbolScVal(params.agentType),
            nativeToScVal(params.rewardStroops, { type: "i128" }),
        ],
    })

    return {
        contractId: SOROBAN_CONFIG.contractId,
        onChainTaskId: params.onChainTaskId.toString(),
        rewardStroops: params.rewardStroops.toString(),
        txHash: receipt.txHash,
        onChainStatus: "pending",
    }
}

export const createTaskOnChain = createEscrowedTask

export async function completeEscrowedTask(params: {
    walletAddress: string
    walletProviderId: string | null
    onChainTaskId: bigint
    payExecutor?: boolean
}): Promise<SorobanTaskReceipt> {
    requireSorobanSupport(params.walletProviderId)

    const receipt = await submitContractInvocation({
        walletAddress: params.walletAddress,
        walletProviderId: params.walletProviderId as SupportedWalletId | null,
        functionName: "complete_task",
        args: [
            nativeToScVal(params.onChainTaskId, { type: "u64" }),
            new Address(params.walletAddress).toScVal(),
            nativeToScVal(Boolean(params.payExecutor), { type: "bool" }),
        ],
    })

    return {
        contractId: SOROBAN_CONFIG.contractId,
        onChainTaskId: params.onChainTaskId.toString(),
        rewardStroops: "0",
        txHash: receipt.txHash,
        onChainStatus: "completed",
    }
}

export const completeTaskOnChain = completeEscrowedTask

export async function cancelEscrowedTask(params: {
    walletAddress: string
    walletProviderId: string | null
    onChainTaskId: bigint
}): Promise<SorobanTaskReceipt> {
    requireSorobanSupport(params.walletProviderId)

    const receipt = await submitContractInvocation({
        walletAddress: params.walletAddress,
        walletProviderId: params.walletProviderId as SupportedWalletId | null,
        functionName: "cancel_task",
        args: [
            nativeToScVal(params.onChainTaskId, { type: "u64" }),
            new Address(params.walletAddress).toScVal(),
        ],
    })

    return {
        contractId: SOROBAN_CONFIG.contractId,
        onChainTaskId: params.onChainTaskId.toString(),
        rewardStroops: "0",
        txHash: receipt.txHash,
        onChainStatus: "cancelled",
    }
}

export const cancelTaskOnChain = cancelEscrowedTask

export async function fetchOnChainTask(params: { taskId: bigint }) {
    const server = getRpcServer()
    const sourceAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0")
    const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: getNetworkPassphrase(),
    })
        .addOperation(
            Operation.invokeContractFunction({
                contract: SOROBAN_CONFIG.contractId,
                function: "get_task",
                args: [nativeToScVal(params.taskId, { type: "u64" })],
            })
        )
        .setTimeout(60)
        .build()

    const simulation = await server.simulateTransaction(tx) as { result?: { retval?: xdr.ScVal } }
    if (!simulation.result?.retval) {
        throw new Error("No task data returned from contract")
    }

    return scValToNative(simulation.result.retval)
}
