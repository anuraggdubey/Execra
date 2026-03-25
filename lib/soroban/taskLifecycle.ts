"use client"

import { cancelEscrowedTask, completeEscrowedTask, createEscrowedTask, rewardXlmToStroops } from "@/lib/soroban/taskEscrowClient"
import type { AgentType } from "@/types/tasks"

export type PreparedOnChainTask = {
    blockchainPayload: {
        onChainTaskId: string
        rewardStroops: string
        contractId: string
        onChainStatus: "pending"
        createTxHash: string
    }
    onChainTaskId: bigint
}

export async function prepareEscrowedTask(params: {
    walletAddress: string
    walletProviderId: string | null
    rewardXlm: string
    agentType: AgentType
}) {
    const onChainTaskId = BigInt(Date.now())
    const rewardStroops = rewardXlmToStroops(params.rewardXlm)

    const receipt = await createEscrowedTask({
        walletAddress: params.walletAddress,
        walletProviderId: params.walletProviderId,
        onChainTaskId,
        rewardStroops,
        agentType: params.agentType,
    })

    return {
        onChainTaskId,
        blockchainPayload: {
            onChainTaskId: receipt.onChainTaskId,
            rewardStroops: receipt.rewardStroops,
            contractId: receipt.contractId,
            onChainStatus: "pending" as const,
            createTxHash: receipt.txHash,
        },
    } satisfies PreparedOnChainTask
}

export async function finalizeEscrowedTask(params: {
    taskId: string
    walletAddress: string
    walletProviderId: string | null
    onChainTaskId: bigint
    blockchainPayload: PreparedOnChainTask["blockchainPayload"]
}) {
    const receipt = await completeEscrowedTask({
        walletAddress: params.walletAddress,
        walletProviderId: params.walletProviderId,
        onChainTaskId: params.onChainTaskId,
        payExecutor: false,
    })

    await fetch("/api/tasks/onchain-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            taskId: params.taskId,
            onChainTaskId: params.blockchainPayload.onChainTaskId,
            rewardStroops: params.blockchainPayload.rewardStroops,
            contractId: params.blockchainPayload.contractId,
            onChainStatus: "completed",
            createTxHash: params.blockchainPayload.createTxHash,
            completeTxHash: receipt.txHash,
        }),
    })
}

export async function rollbackEscrowedTask(params: {
    walletAddress: string
    walletProviderId: string | null
    onChainTaskId: bigint
    taskId?: string
    blockchainPayload: PreparedOnChainTask["blockchainPayload"]
}) {
    const receipt = await cancelEscrowedTask({
        walletAddress: params.walletAddress,
        walletProviderId: params.walletProviderId,
        onChainTaskId: params.onChainTaskId,
    })

    if (params.taskId) {
        await fetch("/api/tasks/onchain-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                taskId: params.taskId,
                onChainTaskId: params.blockchainPayload.onChainTaskId,
                rewardStroops: params.blockchainPayload.rewardStroops,
                contractId: params.blockchainPayload.contractId,
                onChainStatus: "cancelled",
                createTxHash: params.blockchainPayload.createTxHash,
                cancelTxHash: receipt.txHash,
            }),
        })
    }
}
