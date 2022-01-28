import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { ethers } from "ethers";

const RPC_URLS = {
  1: "https://mainnet.infura.io/v3/df505b80faa64c958aba18c3de789ad8",
  4: "https://rinkeby.infura.io/v3/df505b80faa64c958aba18c3de789ad8"
};
const POLLING_INTERVAL = 12000;
const rpcUrl = RPC_URLS[1];//getNodeUrl();
const chainId = parseInt(1, 10);

export const injected = new InjectedConnector({ supportedChainIds: [1, 3, 4, 5, 42] });

export const walletconnect = new WalletConnectConnector({
  chainId: 4,
  rpc: { 4: RPC_URLS[4] },
  qrcode: true,
  bridge: "https://bridge.walletconnect.org",
  pollingInterval: POLLING_INTERVAL,
});

export const resetWalletConnector = (connector) => {
  if (
    connector &&
    connector instanceof WalletConnectConnector
  ) {
    connector.walletConnectProvider = undefined
  }
}

export const connectorsByName = {
  Injected: injected,
  WalletConnect: walletconnect
};

export const getLibrary = (provider) => {
  const library = new ethers.providers.Web3Provider(provider);
  library.pollingInterval = POLLING_INTERVAL;
  return library;
};

export const signMessage = async (provider, account, message) => {
  if (window.BinanceChain) {
    const { signature } = await window.BinanceChain.bnbSign(account, message)
    return signature
  }

  /**
   * Wallet Connect does not sign the message correctly unless you use their method
   * @see https://github.com/WalletConnect/walletconnect-monorepo/issues/462
   */
  if (provider.provider?.wc) {
    const wcMessage = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message))
    const signature = await provider.provider?.wc.signPersonalMessage([wcMessage, account])
    return signature
  }

  return provider.getSigner(account).signMessage(message)
}
