import express from "express"
import { Connection, PublicKey } from "@solana/web3.js"
import { Jupiter } from "@jup-ag/core"
import { TokenListProvider } from "@solana/spl-token-registry"
import fetch from "node-fetch"

const app = express()
app.use(express.json())

const connection = new Connection("https://api.mainnet-beta.solana.com")

app.get("/api/tokens", async (req, res) => {
  const { wallet } = req.query
  if (!wallet) {
    return res.status(400).json({ error: "Wallet address is required" })
  }

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(wallet as string), {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    })

    const tokenList = await new TokenListProvider().resolve()
    const tokenMap = tokenList
      .filterByClusterSlug("mainnet-beta")
      .getList()
      .reduce((map, item) => {
        map.set(item.address, item)
        return map
      }, new Map())

    const tokens = tokenAccounts.value.map((account) => {
      const mintAddress = account.account.data.parsed.info.mint
      const tokenInfo = tokenMap.get(mintAddress)
      return {
        address: mintAddress,
        symbol: tokenInfo?.symbol || "Unknown",
        usdValue: 0, // We'll update this later
      }
    })

    // Fetch token prices
    const priceResponse = await fetch("https://price.jup.ag/v1/price")
    const priceData = await priceResponse.json()

    tokens.forEach((token) => {
      const price = priceData.data[token.address]
      if (price) {
        token.usdValue = price.price
      }
    })

    res.json(tokens)
  } catch (error) {
    console.error("Error fetching token balances:", error)
    res.status(500).json({ error: "Error fetching token balances" })
  }
})

app.post("/api/estimate", async (req, res) => {
  const { wallet, tokens, targetToken } = req.body

  if (!wallet || !tokens || !targetToken) {
    return res.status(400).json({ error: "Missing required parameters" })
  }

  try {
    const jupiter = await Jupiter.load({
      connection,
      cluster: "mainnet-beta",
      user: new PublicKey(wallet),
    })

    let totalEstimatedReturns = 0

    for (const tokenAddress of tokens) {
      const routes = await jupiter.computeRoutes({
        inputMint: new PublicKey(tokenAddress),
        outputMint: new PublicKey(
          targetToken === "SOL"
            ? "So11111111111111111111111111111111111111112"
            : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        ),
        amount: 1000000, // Use a fixed amount for estimation
        slippageBps: 50,
      })

      if (routes.routesInfos.length > 0) {
        totalEstimatedReturns += Number.parseFloat(routes.routesInfos[0].outAmount) / 1e9
      }
    }

    res.json({ estimatedReturns: totalEstimatedReturns })
  } catch (error) {
    console.error("Error estimating returns:", error)
    res.status(500).json({ error: "Error estimating returns" })
  }
})

app.post("/api/swap", async (req, res) => {
  const { wallet, tokens, targetToken } = req.body

  if (!wallet || !tokens || !targetToken) {
    return res.status(400).json({ error: "Missing required parameters" })
  }

  res.writeHead(200, {
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
  })

  try {
    const jupiter = await Jupiter.load({
      connection,
      cluster: "mainnet-beta",
      user: new PublicKey(wallet),
    })

    for (let i = 0; i < tokens.length; i++) {
      const tokenAddress = tokens[i]
      try {
        const routes = await jupiter.computeRoutes({
          inputMint: new PublicKey(tokenAddress),
          outputMint: new PublicKey(
            targetToken === "SOL"
              ? "So11111111111111111111111111111111111111112"
              : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          ),
          amount: 1000000, // Use a fixed amount for simplicity
          slippageBps: 50,
        })

        if (routes.routesInfos.length > 0) {
          const { execute } = await jupiter.exchange({
            routeInfo: routes.routesInfos[0],
          })

          const swapResult = await execute()

          if ("txid" in swapResult) {
            res.write(
              JSON.stringify({
                progress: ((i + 1) / tokens.length) * 100,
                status: `Swapped ${tokenAddress} to ${targetToken}`,
              }) + "\n",
            )
          } else {
            console.error(`Swap failed for ${tokenAddress}:`, swapResult.error)
            res.write(
              JSON.stringify({
                progress: ((i + 1) / tokens.length) * 100,
                status: `Failed to swap ${tokenAddress}`,
              }) + "\n",
            )
          }
        } else {
          console.error(`No routes found for ${tokenAddress}`)
          res.write(
            JSON.stringify({
              progress: ((i + 1) / tokens.length) * 100,
              status: `No routes found for ${tokenAddress}`,
            }) + "\n",
          )
        }
      } catch (error) {
        console.error(`Error swapping ${tokenAddress}:`, error)
        res.write(
          JSON.stringify({
            progress: ((i + 1) / tokens.length) * 100,
            status: `Error swapping ${tokenAddress}`,
          }) + "\n",
        )
      }
    }

    res.write(JSON.stringify({ status: "All swaps completed" }) + "\n")
    res.end()
  } catch (error) {
    console.error("Error executing swaps:", error)
    res.write(JSON.stringify({ error: "Error executing swaps" }) + "\n")
    res.end()
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

