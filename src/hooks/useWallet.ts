import { useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useGameStore } from "../store/gameStore";
import { NETWORK_CONFIG } from "../contracts/addresses";

declare global {
  interface Window {
    ethereum?: any;
    phantom?: { ethereum?: any };
  }
}

export type WalletType = "metamask" | "phantom";

export interface WalletHook {
  address:        string | null;
  balance:        string;
  isConnecting:   boolean;
  isConnected:    boolean;
  walletType:     WalletType | null;
  connect:        (type: WalletType) => Promise<void>;
  disconnect:     () => void;
  switchToMonad:  () => Promise<void>;
  getProvider:    () => ethers.BrowserProvider | null;
  getSigner:      () => Promise<ethers.Signer | null>;
  hasMetaMask:    boolean;
  hasPhantom:     boolean;
}

// ── Resolve the raw EIP-1193 provider for each wallet ─────────────────────────
function getRawProvider(type: WalletType): any | null {
  if (type === "phantom") {
    // Phantom injects window.phantom.ethereum for EVM
    return window.phantom?.ethereum ?? null;
  }
  // MetaMask / any injected EVM provider
  return window.ethereum ?? null;
}

let _ethersProvider: ethers.BrowserProvider | null = null;
let _activeType: WalletType | null = null;

function getEthersProvider(type: WalletType): ethers.BrowserProvider | null {
  const raw = getRawProvider(type);
  if (!raw) return null;
  if (!_ethersProvider || _activeType !== type) {
    _ethersProvider = new ethers.BrowserProvider(raw, "any");
    _activeType = type;
  }
  return _ethersProvider;
}

// ── EIP-3085 / EIP-3326 helper ─────────────────────────────────────────────────
async function addOrSwitchChain(raw: any) {
  const chainHex = "0x" + NETWORK_CONFIG.chainId.toString(16);
  try {
    await raw.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }],
    });
  } catch (switchErr: any) {
    if (switchErr?.code === 4902 || switchErr?.code === -32603) {
      await raw.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId:          chainHex,
          chainName:        NETWORK_CONFIG.name,
          nativeCurrency:   { name: "MON", symbol: "MON", decimals: 18 },
          rpcUrls:          [NETWORK_CONFIG.rpcUrl],
          blockExplorerUrls:[NETWORK_CONFIG.explorer],
        }],
      });
    } else {
      throw switchErr;
    }
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useWallet(): WalletHook {
  const { walletAddress, monBalance, isConnecting, walletType: _walletType, setWallet, setConnecting, setWalletType } =
    useGameStore();
  const walletType = _walletType as WalletType | null;

  const updateBalance = useCallback(async (address: string, type: WalletType) => {
    try {
      const provider = getEthersProvider(type);
      if (!provider) return;
      const bal = await provider.getBalance(address);
      setWallet(address, parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch {
      setWallet(address, "0");
    }
  }, [setWallet]);

  const connect = useCallback(async (type: WalletType) => {
    const raw = getRawProvider(type);
    if (!raw) {
      const url = type === "phantom"
        ? "https://phantom.app/"
        : "https://metamask.io/download/";
      window.open(url, "_blank");
      return;
    }
    setConnecting(true);
    try {
      // Step 1: request accounts FIRST — this triggers the wallet popup for authorization.
      // Phantom requires site authorization before any chain-switching calls.
      const accounts: string[] = await raw.request({ method: "eth_requestAccounts" });

      if (accounts.length === 0) {
        console.warn(`${type}: no accounts returned`);
        return;
      }

      // Step 2: now that we're authorized, switch/add Monad chain
      try {
        await addOrSwitchChain(raw);
      } catch (chainErr: any) {
        // Non-fatal: user may decline the network switch; we still store the account
        console.warn(`${type}: chain switch declined —`, chainErr?.message ?? String(chainErr));
      }

      setWalletType(type);
      _ethersProvider = null; // rebuild with new type
      await updateBalance(accounts[0], type);

    } catch (err: any) {
      // 4001 = user rejected, -32603 = internal error — these are expected, not crashes
      const code: number = err?.code ?? 0;
      const msg: string  = err?.message ?? err?.details ?? String(err);
      if (code === 4001 || msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("not been authorized")) {
        console.info(`${type}: user cancelled connection`);
      } else {
        console.error(`${type} connect error [${code}]:`, msg);
      }
    } finally {
      setConnecting(false);
    }
  }, [setConnecting, setWalletType, updateBalance]);

  const disconnect = useCallback(() => {
    setWallet(null, "0");
    setWalletType(null);
    _ethersProvider = null;
    _activeType = null;
  }, [setWallet, setWalletType]);

  const switchToMonad = useCallback(async () => {
    const raw = getRawProvider(walletType ?? "metamask");
    if (!raw) return;
    try { await addOrSwitchChain(raw); } catch (e) { console.error(e); }
  }, [walletType]);

  // Auto-reconnect on mount if wallet was previously connected
  useEffect(() => {
    if (walletAddress && walletType) {
      updateBalance(walletAddress, walletType);
    }

    const raw = getRawProvider(walletType ?? "metamask");
    if (!raw) return;

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else updateBalance(accounts[0], walletType ?? "metamask");
    };
    const onChainChanged = () => {
      _ethersProvider = null;
      window.location.reload();
    };

    raw.on?.("accountsChanged", onAccountsChanged);
    raw.on?.("chainChanged",    onChainChanged);
    return () => {
      raw.removeListener?.("accountsChanged", onAccountsChanged);
      raw.removeListener?.("chainChanged",    onChainChanged);
    };
  }, [walletAddress, walletType, disconnect, updateBalance]);

  const getProvider = useCallback((): ethers.BrowserProvider | null => {
    return getEthersProvider(walletType ?? "metamask");
  }, [walletType]);

  const getSigner = useCallback(async (): Promise<ethers.Signer | null> => {
    const p = getEthersProvider(walletType ?? "metamask");
    if (!p || !walletAddress) return null;
    return p.getSigner();
  }, [walletType, walletAddress]);

  return {
    address:      walletAddress,
    balance:      monBalance,
    isConnecting,
    isConnected:  !!walletAddress,
    walletType:   walletType as WalletType | null,
    connect,
    disconnect,
    switchToMonad,
    getProvider,
    getSigner,
    hasMetaMask:  typeof window !== "undefined" && !!window.ethereum,
    hasPhantom:   typeof window !== "undefined" && !!window.phantom?.ethereum,
  };
}
