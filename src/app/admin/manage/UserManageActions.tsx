"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function UserManageActions({
  userId, userEmail, userName,
}: { userId: string; userEmail: string; userName: string }) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState<string|null>(null)
  const [msg, setMsg] = useState<{text:string; ok:boolean}|null>(null)

  async function call(action: string, extra?: any) {
    setLoading(action)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setMsg({ text: data.message || "Done", ok: true })
      router.refresh()
    } catch (e: any) {
      setMsg({ text: e.message, ok: false })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 text-sm">Actions for {userName}</h3>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.ok?"bg-green-50 text-green-800 border border-green-200":"bg-red-50 text-red-800 border border-red-200"}`}>
          {msg.ok ? "✓" : "✗"} {msg.text}
        </div>
      )}

      {/* Change password */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-gray-700">Change Password</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
          <button
            onClick={() => { if(newPassword.length>=6) call("changePassword",{newPassword}); else setMsg({text:"Min 6 characters",ok:false}) }}
            disabled={loading==="changePassword"}
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-50 whitespace-nowrap">
            {loading==="changePassword" ? "Saving…" : "Set Password"}
          </button>
        </div>
      </div>

      {/* Delete all sessions */}
      <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Delete All Test Data</p>
          <p className="text-xs text-gray-400">Removes all sessions for this user</p>
        </div>
        <button
          onClick={() => { if(confirm(`Delete all tests for ${userName}?`)) call("deleteSessions") }}
          disabled={loading==="deleteSessions"}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
          {loading==="deleteSessions" ? "Deleting…" : "Delete Tests"}
        </button>
      </div>

      {/* Delete account */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-red-800">Delete Account</p>
          <p className="text-xs text-red-400">Permanently removes {userEmail}</p>
        </div>
        <button
          onClick={() => { if(confirm(`PERMANENTLY delete account for ${userName}? This cannot be undone.`)) call("deleteUser") }}
          disabled={loading==="deleteUser"}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
          {loading==="deleteUser" ? "Deleting…" : "Delete Account"}
        </button>
      </div>
    </div>
  )
}
