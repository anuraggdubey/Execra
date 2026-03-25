export type AgentType = "github" | "coding" | "document"

export type TaskStatus = "pending" | "completed" | "failed"

export type CodingTaskOutput =
    | {
        kind: "project"
        files: {
            "index.html": string
            "style.css": string
            "script.js": string
        }
        previewEntry: "index.html"
      }
    | {
        kind: "single-file"
        filename: string
        language: string
        code: string
      }

export type TaskOutputResult = CodingTaskOutput | Record<string, unknown> | string | null

export type TaskRecord = {
    id: string
    wallet_address: string
    agent_type: AgentType
    input_prompt: string
    output_result: TaskOutputResult
    status: TaskStatus
    created_at: string
}
