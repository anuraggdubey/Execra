import { NextResponse } from "next/server"
import { analyzeRepository } from "@/lib/agents/githubAgentService"

export async function POST(req: Request) {
    try {
        const { owner, repo, context } = await req.json()
        if (!context) return NextResponse.json({ error: "Repo context is required" }, { status: 400 })

        return NextResponse.json({
            success: true,
            analysis: await analyzeRepository({ owner, repo, context }),
        })
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Analysis failed" }, { status: 500 })
    }
}
