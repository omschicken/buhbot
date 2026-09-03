import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)

  const gameUrl = `http://localhost:3000/api/games/${id}/launch`

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-[#0f3460]/90 backdrop-blur px-4 py-2 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lobby
        </button>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400 text-sm">Game #{id}</span>
      </div>

      {/* Iframe area */}
      <div className="flex-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#00ff88]/30 border-t-[#00ff88] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading game...</p>
            </div>
          </div>
        )}
        <iframe
          src={gameUrl}
          className="w-full h-full"
          onLoad={() => setLoaded(true)}
          allow="fullscreen"
          title={`Game ${id}`}
        />
      </div>
    </div>
  )
}
