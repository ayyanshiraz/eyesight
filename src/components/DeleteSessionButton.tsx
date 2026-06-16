// app/dashboard/DeleteSessionButton.tsx (or wherever you keep components)
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this screening?")
    if (!confirmed) return

    setIsDeleting(true)

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        // Refresh the server component to instantly remove the deleted item from the UI
        router.refresh()
      } else {
        alert("Failed to delete the session. Please try again.")
        setIsDeleting(false)
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Something went wrong.")
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="btn-secondary px-4 py-2 text-sm text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  )
}