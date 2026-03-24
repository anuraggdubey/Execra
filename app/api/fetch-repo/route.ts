import { NextResponse } from "next/server"
import { fetchRepoContext } from "@/lib/agents/githubAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"
import { readGitHubAccessToken } from "@/lib/githubAccessToken"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { owner, repo } = body
        const accessToken = readGitHubAccessToken(req)

        if (!accessToken || !owner || !repo) {
            return NextResponse.json({ error: "GitHub access token, owner, and repo are required" }, { status: 400 })
        }

        const result = await fetchRepoContext({ accessToken, owner, repo })
        return NextResponse.json({ success: true, ...result })
    } catch (err: unknown) {
        if (err instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: err.message, code: err.code, details: err.details },
                { status: err.status }
            )
        }

        return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to fetch repo" }, { status: 500 })
    }
}
