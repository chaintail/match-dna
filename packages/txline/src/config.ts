import { PublicKey } from "@solana/web3.js";
export type TxLineNetwork = "devnet" | "mainnet";
export interface TxLineConfig {
  network: TxLineNetwork;
  baseUrl: string;
  programId: PublicKey;
}
export const TXLINE_CONFIGS: Record<TxLineNetwork, TxLineConfig> = {
  devnet: {
    network: "devnet",
    baseUrl: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
  },
  mainnet: {
    network: "mainnet",
    baseUrl: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
  },
};
export interface TxLineCredentials {
  jwt: string;
  apiToken: string;
}
