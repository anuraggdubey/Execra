"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { useAgentContext } from "@/lib/AgentContext"

export default function ActivityPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const { activities } = useAgentContext()

    const filteredEvents = useMemo(() => {
        return activities.filter((event) => {
            const matchesSearch =
                event.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.message.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesType = typeFilter === "all" || event.type === typeFilter
            return matchesSearch && matchesType
        })
    }, [activities, searchTerm, typeFilter])

    return (
        <div className="mx-auto max-w-4xl space-y-4">
            <div>
                <h1 className="text-lg font-semibold text-foreground">Activity</h1>
                <p className="text-sm text-foreground-soft">Recent execution history</p>
            </div>

            <div className="flex items-center gap-3">
                <div className="input-shell flex flex-1 items-center gap-2 px-3 py-2">
                    <Search size={14} className="text-muted" />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search activity..."
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted"
                    />
                </div>
                <div className="flex items-center gap-1">
                    {["all", "execution", "system"].map((type) => (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                typeFilter === type
                                    ? "bg-primary-soft text-foreground"
                                    : "text-muted hover:text-foreground"
                            }`}
                        >
                            <span className="capitalize">{type === "all" ? "All" : type}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-1">
                {filteredEvents.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-sm text-muted">No matching activity</p>
                    </div>
                ) : (
                    filteredEvents.map((event) => (
                        <div key={event.id} className="flex items-start justify-between gap-4 rounded-lg px-3 py-3 hover:bg-surface-elevated">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground">{event.agent}</span>
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                        event.status === "success" ? "bg-emerald-500/10 text-emerald-500"
                                        : event.status === "error" ? "bg-red-500/10 text-red-500"
                                        : "bg-surface-elevated text-muted"
                                    }`}>
                                        {event.status}
                                    </span>
                                </div>
                                <p className="mt-1 truncate text-xs text-foreground-soft">{event.message}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <div className="text-[10px] text-muted">{event.time}</div>
                                {event.reward !== null && (
                                    <div className="mt-0.5 text-xs font-medium text-success">+{event.reward}</div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
