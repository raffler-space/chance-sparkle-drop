import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'Raffler',
  projectId: '2df0f6c681b062523668597d1c63f31d',
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
    [sepolia.id]: http('https://rpc.ankr.com/eth_sepolia'),
  },
  ssr: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
    },
  },
});

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: 'hsl(185, 100%, 50%)', // Neon cyan
            accentColorForeground: 'hsl(225, 71%, 4%)',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
