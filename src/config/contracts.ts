// Smart Contract Configuration
// Update these addresses after deployment

export type NetworkConfig = {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    raffle: string;
    usdt?: string;
  };
  chainlink: {
    vrfCoordinator: string;
    gasLane: string;
  };
};

// Sepolia Testnet Configuration
export const sepoliaConfig: NetworkConfig = {
  chainId: 11155111,
  name: "Sepolia",
  rpcUrl: "https://sepolia.drpc.org",
  blockExplorer: "https://sepolia.etherscan.io",
  nativeCurrency: {
    name: "Sepolia ETH",
    symbol: "SepoliaETH",
    decimals: 18,
  },
  contracts: {
    raffle: "0xFb60F5E74175089b944c673583Bb2d133A98F8A1",
    usdt: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06", // Sepolia USDT mock
  },
  chainlink: {
    vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
  },
};

// Ethereum Mainnet Configuration
export const mainnetConfig: NetworkConfig = {
  chainId: 1,
  name: "Ethereum Mainnet",
  rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/your-api-key",
  blockExplorer: "https://etherscan.io",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  contracts: {
    raffle: "0x0000000000000000000000000000000000000000", // UPDATE AFTER DEPLOYMENT
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Real USDT
  },
  chainlink: {
    vrfCoordinator: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
    gasLane: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
  },
};

// Network configurations map
export const networks: Record<number, NetworkConfig> = {
  [sepoliaConfig.chainId]: sepoliaConfig,
  [mainnetConfig.chainId]: mainnetConfig,
};

// Get current network configuration
export const getNetworkConfig = (chainId: number): NetworkConfig | undefined => {
  return networks[chainId];
};

// Check if network is supported
export const isSupportedNetwork = (chainId: number): boolean => {
  return chainId in networks;
};

// Default to Sepolia for development
export const defaultNetwork = sepoliaConfig;

// Contract ABI will be imported after compilation
export const RAFFLE_ABI = [
  "function createRaffle(string name, string description, uint256 ticketPrice, uint256 maxTickets, uint256 duration, address nftContract) returns (uint256)",
  "function buyTickets(uint256 raffleId, uint256 quantity) payable",
  "function selectWinner(uint256 raffleId)",
  "function claimPrize(uint256 raffleId)",
  "function withdrawFees()",
  "function getUserEntries(uint256 raffleId, address user) view returns (uint256[])",
  "function getRaffleEntries(uint256 raffleId) view returns (uint256[])",
  "function raffles(uint256) view returns (string name, string description, uint256 ticketPrice, uint256 maxTickets, uint256 ticketsSold, uint256 endTime, address winner, bool isActive, bool vrfRequested, address nftContract)",
  "function raffleCounter() view returns (uint256)",
  "function platformFee() view returns (uint256)",
  "event RaffleCreated(uint256 indexed raffleId, string name, uint256 ticketPrice, uint256 maxTickets)",
  "event TicketPurchased(uint256 indexed raffleId, address indexed buyer, uint256 quantity)",
  "event WinnerRequested(uint256 indexed raffleId, uint256 requestId)",
  "event WinnerSelected(uint256 indexed raffleId, address indexed winner, uint256 winningEntry)",
  "event PrizeClaimed(uint256 indexed raffleId, address indexed winner)"
] as const;
