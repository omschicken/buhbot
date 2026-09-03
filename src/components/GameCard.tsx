import { useNavigate } from 'react-router-dom'

interface GameCardProps {
  id: string
  name: string
  provider: string
  category: string
  imageUrl?: string
  rtp?: number
}

const categoryColors: Record<string, string> = {
  slots: 'from-purple-900 to-purple-700',
  table: 'from-blue-900 to-blue-700',
  live: 'from-red-900 to-red-700',
}

export default function GameCard({ id, name, provider, category, imageUrl, rtp }: GameCardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/game/${id}`)}
      className="bg-[#16213e] rounded-xl border border-white/5 overflow-hidden cursor-pointer group hover:scale-105 hover:border-[#00ff88]/30 transition-all duration-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${categoryColors[category] || 'from-gray-900 to-gray-700'} flex items-center justify-center`}>
            <span className="text-white/60 text-sm font-medium text-center px-2">{name}</span>
          </div>
        )}
        {rtp !== undefined && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-[#00ff88] font-medium">
            RTP {rtp}%
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#00ff88] text-[#1a1a2e] font-bold rounded-lg px-4 py-2 text-sm">
            Play Now
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="font-semibold text-white text-sm truncate">{name}</div>
        <div className="text-gray-400 text-xs mt-0.5">{provider}</div>
      </div>
    </div>
  )
}
