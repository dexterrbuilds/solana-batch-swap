import { useState } from "react"
import type { TokenInfo } from "../types/token"

interface TokenSelectorProps {
  tokens: TokenInfo[]
  selectedTokens: string[]
  setSelectedTokens: (tokens: string[]) => void
  targetToken: "SOL" | "USDC"
  setTargetToken: (token: "SOL" | "USDC") => void
}

export default function TokenSelector({
  tokens,
  selectedTokens,
  setSelectedTokens,
  targetToken,
  setTargetToken,
}: TokenSelectorProps) {
  const [priceThreshold, setPriceThreshold] = useState<number>(0.1)

  const handleTokenSelection = (tokenAddress: string) => {
    if (selectedTokens.includes(tokenAddress)) {
      setSelectedTokens(selectedTokens.filter((t) => t !== tokenAddress))
    } else {
      setSelectedTokens([...selectedTokens, tokenAddress])
    }
  }

  const handleAutoSelect = () => {
    const autoSelectedTokens = tokens.filter((token) => token.usdValue < priceThreshold).map((token) => token.address)
    setSelectedTokens(autoSelectedTokens)
  }

  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold mb-2">Select Tokens to Swap</h2>
      <div className="flex items-center mb-2">
        <input
          type="number"
          value={priceThreshold}
          onChange={(e) => setPriceThreshold(Number(e.target.value))}
          className="border rounded px-2 py-1 mr-2"
        />
        <button onClick={handleAutoSelect} className="bg-blue-500 text-white px-4 py-2 rounded">
          Auto-select tokens under ${priceThreshold}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tokens.map((token) => (
          <div
            key={token.address}
            className={`border p-2 rounded cursor-pointer ${
              selectedTokens.includes(token.address) ? "bg-blue-100" : ""
            }`}
            onClick={() => handleTokenSelection(token.address)}
          >
            <p>{token.symbol}</p>
            <p>${token.usdValue.toFixed(2)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Target Token</h3>
        <select
          value={targetToken}
          onChange={(e) => setTargetToken(e.target.value as "SOL" | "USDC")}
          className="border rounded px-2 py-1"
        >
          <option value="SOL">SOL</option>
          <option value="USDC">USDC</option>
        </select>
      </div>
    </div>
  )
}

