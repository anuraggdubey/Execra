import { NextResponse } from "next/server"
import { runCodingAgent } from "@/lib/agents/codingAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"

export const maxDuration = 60

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { prompt, language } = body

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
        }

        const result = await runCodingAgent(prompt, typeof language === "string" ? language : undefined)
        return NextResponse.json({ success: true, ...result })
    } catch (error: unknown) {
        console.error("[run-coding-agent] Error:", error)

        if (error instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: error.message, code: error.code, details: error.details },
                { status: error.status }
            )
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        )
    }
}
