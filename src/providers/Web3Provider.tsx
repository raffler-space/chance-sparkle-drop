import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'Raffler',
  projectId: '2df0f6c681b062523668597d1c63f31d',
  chains: [sepolia, mainnet],
  transports: {
    [sepolia.id]: http('https://sepolia.drpc.org'),
    [mainnet.id]: http(),
  },
  ssr: false,
});

const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={sepolia}
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
