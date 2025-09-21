import { Raydium, TxVersion, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2'
import { Connection, Keypair, clusterApiUrl, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58'

// Environment-driven configuration. For production set these env vars in your host.
const RPC_URL = process.env.RPC_URL && String(process.env.RPC_URL).trim() || clusterApiUrl('devnet')
const OWNER_SECRET_B58 = process.env.OWNER_SECRET_B58 && String(process.env.OWNER_SECRET_B58).trim()

export const owner: Keypair = OWNER_SECRET_B58
  ? Keypair.fromSecretKey(bs58.decode(OWNER_SECRET_B58))
  : Keypair.generate()

export const connection = new Connection(RPC_URL, 'confirmed')
export const txVersion = TxVersion?.V0 ?? (TxVersion as any)

const cluster = RPC_URL.includes('devnet') ? 'devnet' : 'mainnet'

let raydium: Raydium | undefined
export const initSdk = async (params?: { loadToken?: boolean }) => {
  if (raydium) return raydium
  try {
    if (connection.rpcEndpoint === clusterApiUrl('mainnet-beta'))
      console.warn('using free rpc node might cause unexpected error, strongly suggest uses paid rpc node')
  } catch (e) {
    /* ignore */
  }
  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster}`)
  const RaydiumLib = (await import('@raydium-io/raydium-sdk-v2')) as any
  const RaydiumCtor = RaydiumLib.Raydium ?? RaydiumLib.default ?? RaydiumLib
  raydium = await RaydiumCtor.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: 'finalized',
  })
  return raydium
}

export const fetchTokenAccountData = async () => {
  const solAccountResp = await connection.getAccountInfo(owner.publicKey)
  const tokenAccountResp = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_PROGRAM_ID })
  const token2022Req = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_2022_PROGRAM_ID })
  const tokenAccountData = parseTokenAccountResp({
    owner: owner.publicKey as PublicKey,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  })
  return tokenAccountData
}

export const grpcUrl = process.env.GRPC_URL || ''
export const grpcToken = process.env.GRPC_TOKEN || ''

export default {
  owner,
  connection,
  txVersion,
}
