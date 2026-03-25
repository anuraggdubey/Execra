import { AgentExecutionError } from "@/lib/agents/shared"
import { getSupabaseServerClient } from "@/lib/supabaseServer"
import {
    requireAgentType,
    requireTaskStatus,
    requireWalletAddress,
} from "@/lib/services/validation"
import type { TaskOutputResult, TaskRecord, TaskStatus } from "@/types/tasks"

type CreateTaskInput = {
    walletAddress: unknown
    agentType: unknown
    inputPrompt: unknown
    status?: unknown
}

type UpdateTaskInput = {
    taskId: string
    outputResult?: TaskOutputResult
    status: unknown
}

function normalizeError(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

export async function createTask(input: CreateTaskInput) {
    const walletAddress = requireWalletAddress(input.walletAddress)
    const agentType = requireAgentType(input.agentType)
    const inputPrompt = typeof input.inputPrompt === "string" ? input.inputPrompt.trim() : ""
    const status = input.status ? requireTaskStatus(input.status) : "pending"
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
        .from("tasks")
        .insert({
            wallet_address: walletAddress,
            agent_type: agentType,
            input_prompt: inputPrompt,
            status,
        })
        .select("id, wallet_address, agent_type, input_prompt, output_result, status, created_at")
        .single()

    if (error) {
        throw new AgentExecutionError("DB_TASK_CREATE_FAILED", normalizeError(error, "Failed to create task."), 500)
    }

    return data as TaskRecord
}

export async function updateTask(input: UpdateTaskInput) {
    const status = requireTaskStatus(input.status)
    const supabase = getSupabaseServerClient()

    const updates: {
        output_result?: TaskOutputResult
        status: TaskStatus
    } = { status }

    if (input.outputResult !== undefined) {
        updates.output_result = input.outputResult
    }

    const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", input.taskId)
        .select("id, wallet_address, agent_type, input_prompt, output_result, status, created_at")
        .single()

    if (error) {
        throw new AgentExecutionError("DB_TASK_UPDATE_FAILED", normalizeError(error, "Failed to update task."), 500)
    }

    return data as TaskRecord
}

export async function failTask(taskId: string, message: string) {
    return updateTask({
        taskId,
        status: "failed",
        outputResult: { error: message },
    })
}

export async function createAgentRun(taskId: string, executionLogs: unknown, duration: number) {
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
        .from("agent_runs")
        .insert({
            task_id: taskId,
            execution_logs: executionLogs,
            duration,
        })
        .select("id, task_id, created_at")
        .single()

    if (error) {
        throw new AgentExecutionError("DB_AGENT_RUN_CREATE_FAILED", normalizeError(error, "Failed to create agent run."), 500)
    }

    return data
}

export async function getUserTasks(walletAddressInput: unknown, limit = 20) {
    const walletAddress = requireWalletAddress(walletAddressInput)
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
        .from("tasks")
        .select("id, wallet_address, agent_type, input_prompt, output_result, status, created_at")
        .eq("wallet_address", walletAddress)
        .order("created_at", { ascending: false })
        .limit(limit)

    if (error) {
        throw new AgentExecutionError("DB_TASK_FETCH_FAILED", normalizeError(error, "Failed to fetch tasks."), 500)
    }

    return (data ?? []) as TaskRecord[]
}

export async function getRecentTasks(limit = 10) {
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
        .from("tasks")
        .select("id, wallet_address, agent_type, input_prompt, output_result, status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit)

    if (error) {
        throw new AgentExecutionError("DB_RECENT_TASK_FETCH_FAILED", normalizeError(error, "Failed to fetch recent tasks."), 500)
    }

    return (data ?? []) as TaskRecord[]
}

export async function getTaskById(taskId: string) {
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
        .from("tasks")
        .select("id, wallet_address, agent_type, input_prompt, output_result, status, created_at")
        .eq("id", taskId)
        .single()

    if (error) {
        throw new AgentExecutionError("DB_TASK_LOOKUP_FAILED", normalizeError(error, "Failed to fetch task."), 404)
    }

    return data as TaskRecord
}
