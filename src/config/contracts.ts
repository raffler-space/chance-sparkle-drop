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
    raffle: "0x094e1309187D5f546067Ee22138Be6F0A39d1800",
    usdt: "0x11BBef28D8effD775F9674798cd219394F9C1969", // Sepolia USDT mock
  },
  chainlink: {
    vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B", // VRF v2.5
    gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae", // 500 gwei Key Hash
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

// Contract ABIs
export const RAFFLE_ABI = [
  // Ownable functions
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
  
  // Raffle functions
  "function createRaffle(string name, string description, uint256 ticketPrice, uint256 maxTickets, uint256 duration, address nftContract) returns (uint256)",
  "function buyTickets(uint256 raffleId, uint256 quantity)",
  "function selectWinner(uint256 raffleId)",
  "function claimPrize(uint256 raffleId)",
  "function withdrawFees()",
  "function getUserEntries(uint256 raffleId, address user) view returns (uint256[])",
  "function getRaffleEntries(uint256 raffleId) view returns (uint256[])",
  "function raffles(uint256) view returns (string name, string description, uint256 ticketPrice, uint256 maxTickets, uint256 ticketsSold, uint256 endTime, address winner, bool isActive, bool vrfRequested, address nftContract)",
  "function raffleCounter() view returns (uint256)",
  "function platformFee() view returns (uint256)",
  "function usdtToken() view returns (address)",
  
  // Events
  "event RaffleCreated(uint256 indexed raffleId, string name, uint256 ticketPrice, uint256 maxTickets)",
  "event TicketPurchased(uint256 indexed raffleId, address indexed buyer, uint256 quantity)",
  "event WinnerRequested(uint256 indexed raffleId, uint256 requestId)",
  "event WinnerSelected(uint256 indexed raffleId, address indexed winner, uint256 winningEntry)",
  "event PrizeClaimed(uint256 indexed raffleId, address indexed winner)"
] as const;

export const USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function mintWithDecimals(address to, uint256 amount)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
] as const;
