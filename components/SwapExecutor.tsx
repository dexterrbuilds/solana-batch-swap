import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"

interface SwapExecutorProps {
  selectedTokens: string[]
  targetToken: "SOL" | "USDC"
}

export default function SwapExecutor({ selectedTokens, targetToken }: SwapExecutorProps) {
  const { publicKey } = useWallet()
  const [estimatedReturns, setEstimatedReturns] = useState<number | null>(null)
  const [swapProgress, setSwapProgress] = useState<number>(0)
  const [swapStatus, setSwapStatus] = useState<string>("")

  const handleEstimateReturns = async () => {
    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: publicKey?.toBase58(),
          tokens: selectedTokens,
          targetToken,
        }),
      })
      const data = await response.json()
      setEstimatedReturns(data.estimatedReturns)
    } catch (error) {
      console.error("Error estimating returns:", error)
      setSwapStatus("Error estimating returns")
    }
  }

  const handleExecuteSwaps = async () => {
    setSwapProgress(0)
    setSwapStatus("Executing swaps...")

    try {
      const response = await fetch("/api/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: publicKey?.toBase58(),
          tokens: selectedTokens,
          targetToken,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value)
        const update = JSON.parse(chunk)

        if (update.progress) {
          setSwapProgress(update.progress)
        }
        if (update.status) {
          setSwapStatus(update.status)
        }
      }

      setSwapStatus("Swaps completed successfully")
    } catch (error) {
      console.error("Error executing swaps:", error)
      setSwapStatus("Error executing swaps")
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Swap Execution</h2>
      <button
        onClick={handleEstimateReturns}
        className="bg-green-500 text-white px-4 py-2 rounded mr-2"
        disabled={selectedTokens.length === 0}
      >
        Estimate Returns
      </button>
      {estimatedReturns !== null && (
        <p className="my-2">
          Estimated returns: {estimatedReturns.toFixed(4)} {targetToken}
        </p>
      )}
      <button
        onClick={handleExecuteSwaps}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        disabled={selectedTokens.length === 0}
      >
        Execute Swaps
      </button>
      {swapProgress > 0 && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${swapProgress}%` }}></div>
          </div>
          <p className="mt-2">{swapStatus}</p>
        </div>
      )}
    </div>
  )
}

