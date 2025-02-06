"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import TokenSelector from "../components/TokenSelector"
import SwapExecutor from "../components/SwapExecutor"
import type { TokenInfo } from "../types/token"

export default function Home() {
  const { publicKey, connected } = useWallet()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [selectedTokens, setSelectedTokens] = useState<string[]>([])
  const [targetToken, setTargetToken] = useState<"SOL" | "USDC">("SOL")

  useEffect(() => {
    if (connected && publicKey) {
      fetchTokenBalances()
    }
  }, [connected, publicKey])

  const fetchTokenBalances = async () => {
    try {
      const response = await fetch(`/api/tokens?wallet=${publicKey?.toBase58()}`)
      const data = await response.json()
      setTokens(data)
    } catch (error) {
      console.error("Error fetching token balances:", error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Solana Batch Token Swap</h1>
      <WalletMultiButton className="mb-4" />
      {connected ? (
        <>
          <TokenSelector
            tokens={tokens}
            selectedTokens={selectedTokens}
            setSelectedTokens={setSelectedTokens}
            targetToken={targetToken}
            setTargetToken={setTargetToken}
          />
          <SwapExecutor selectedTokens={selectedTokens} targetToken={targetToken} />
        </>
      ) : (
        <div>Please connect your wallet to continue.</div>
      )}
    </div>
  )
}

