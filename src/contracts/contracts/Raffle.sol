// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Raffle
 * @dev NFT-gated raffle system using Chainlink VRF for provably fair winner selection
 */
contract Raffle is VRFConsumerBaseV2, Ownable, ReentrancyGuard {
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    
    // Chainlink VRF Configuration
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Raffle State
    struct RaffleInfo {
        string name;
        string description;
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 ticketsSold;
        uint256 endTime;
        address winner;
        bool isActive;
        bool vrfRequested;
        address nftContract; // NFT contract address for gating
        uint256[] entries; // Array of entry IDs
    }

    mapping(uint256 => RaffleInfo) public raffles;
    mapping(uint256 => mapping(address => uint256[])) public userEntries; // raffleId => user => entryIds
    mapping(uint256 => uint256) public vrfRequestToRaffleId; // VRF request ID to raffle ID
    
    uint256 public raffleCounter;
    uint256 public platformFee = 5; // 5% platform fee

    // Events
    event RaffleCreated(uint256 indexed raffleId, string name, uint256 ticketPrice, uint256 maxTickets);
    event TicketPurchased(uint256 indexed raffleId, address indexed buyer, uint256 quantity);
    event WinnerRequested(uint256 indexed raffleId, uint256 requestId);
    event WinnerSelected(uint256 indexed raffleId, address indexed winner, uint256 winningEntry);
    event PrizeClaimed(uint256 indexed raffleId, address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
    }

    /**
     * @dev Create a new raffle
     */
    function createRaffle(
        string memory name,
        string memory description,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        address nftContract
    ) external onlyOwner returns (uint256) {
        require(maxTickets > 0, "Max tickets must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");

        uint256 raffleId = raffleCounter++;
        
        raffles[raffleId] = RaffleInfo({
            name: name,
            description: description,
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            ticketsSold: 0,
            endTime: block.timestamp + duration,
            winner: address(0),
            isActive: true,
            vrfRequested: false,
            nftContract: nftContract,
            entries: new uint256[](0)
        });

        emit RaffleCreated(raffleId, name, ticketPrice, maxTickets);
        return raffleId;
    }

    /**
     * @dev Purchase raffle tickets
     * @param raffleId The ID of the raffle
     * @param quantity Number of tickets to purchase
     */
    function buyTickets(uint256 raffleId, uint256 quantity) 
        external 
        payable 
        nonReentrant 
    {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.isActive, "Raffle is not active");
        require(block.timestamp < raffle.endTime, "Raffle has ended");
        require(raffle.ticketsSold + quantity <= raffle.maxTickets, "Not enough tickets available");
        require(msg.value == raffle.ticketPrice * quantity, "Incorrect payment amount");
        
        // Check NFT ownership if NFT contract is set
        if (raffle.nftContract != address(0)) {
            require(
                IERC721(raffle.nftContract).balanceOf(msg.sender) > 0,
                "Must own NFT to participate"
            );
        }

        // Add entries
        for (uint256 i = 0; i < quantity; i++) {
            uint256 entryId = raffle.ticketsSold + i;
            raffle.entries.push(entryId);
            userEntries[raffleId][msg.sender].push(entryId);
        }

        raffle.ticketsSold += quantity;
        
        emit TicketPurchased(raffleId, msg.sender, quantity);
    }

    /**
     * @dev Request random winner selection via Chainlink VRF
     */
    function selectWinner(uint256 raffleId) external onlyOwner {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.isActive, "Raffle is not active");
        require(block.timestamp >= raffle.endTime, "Raffle has not ended yet");
        require(!raffle.vrfRequested, "Winner already requested");
        require(raffle.ticketsSold > 0, "No tickets sold");

        raffle.vrfRequested = true;

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        vrfRequestToRaffleId[requestId] = raffleId;
        
        emit WinnerRequested(raffleId, requestId);
    }

    /**
     * @dev Chainlink VRF callback
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 raffleId = vrfRequestToRaffleId[requestId];
        RaffleInfo storage raffle = raffles[raffleId];

        uint256 winningIndex = randomWords[0] % raffle.ticketsSold;
        uint256 winningEntry = raffle.entries[winningIndex];

        // Find the winner
        address winner;
        for (uint256 i = 0; i < raffle.ticketsSold; i++) {
            address participant = getParticipantAtIndex(raffleId, i);
            uint256[] memory entries = userEntries[raffleId][participant];
            
            for (uint256 j = 0; j < entries.length; j++) {
                if (entries[j] == winningEntry) {
                    winner = participant;
                    break;
                }
            }
            
            if (winner != address(0)) break;
        }

        raffle.winner = winner;
        raffle.isActive = false;

        emit WinnerSelected(raffleId, winner, winningEntry);
    }

    /**
     * @dev Claim prize (transfer funds to winner)
     */
    function claimPrize(uint256 raffleId) external nonReentrant {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.winner == msg.sender, "You are not the winner");
        require(!raffle.isActive, "Raffle still active");

        uint256 totalPrize = raffle.ticketPrice * raffle.ticketsSold;
        uint256 fee = (totalPrize * platformFee) / 100;
        uint256 winnerAmount = totalPrize - fee;

        (bool success, ) = payable(msg.sender).call{value: winnerAmount}("");
        require(success, "Transfer failed");

        emit PrizeClaimed(raffleId, msg.sender);
    }

    /**
     * @dev Withdraw platform fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get user entries for a raffle
     */
    function getUserEntries(uint256 raffleId, address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userEntries[raffleId][user];
    }

    /**
     * @dev Get all entries for a raffle
     */
    function getRaffleEntries(uint256 raffleId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return raffles[raffleId].entries;
    }

    /**
     * @dev Helper function to get participant at index
     */
    function getParticipantAtIndex(uint256 raffleId, uint256 index) 
        private 
        view 
        returns (address) 
    {
        // This is a simplified version - in production, maintain a separate participants array
        return address(0); // Placeholder
    }
}
