// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Raffle
 * @dev NFT-gated raffle system using Chainlink VRF for provably fair winner selection
 */
contract Raffle is VRFConsumerBaseV2Plus, ReentrancyGuard, Ownable {
    IVRFCoordinatorV2Plus private immutable i_vrfCoordinator;
    
    // Chainlink VRF Configuration
    uint256 private immutable i_subscriptionId;
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
    mapping(uint256 => mapping(uint256 => address)) public entryOwner; // raffleId => entryId => owner (O(1) winner lookup)
    mapping(uint256 => uint256) public vrfRequestToRaffleId; // VRF request ID to raffle ID
    mapping(uint256 => address[]) private participants; // raffleId => participants array
    
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
        uint256 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2Plus(vrfCoordinatorV2) Ownable(msg.sender) {
        i_vrfCoordinator = IVRFCoordinatorV2Plus(vrfCoordinatorV2);
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
        require(!raffle.vrfRequested, "Winner selection in progress");
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

        // Track participant if first time
        if (userEntries[raffleId][msg.sender].length == 0) {
            participants[raffleId].push(msg.sender);
        }

        // Add entries
        for (uint256 i = 0; i < quantity; i++) {
            uint256 entryId = raffle.ticketsSold + i;
            raffle.entries.push(entryId);
            userEntries[raffleId][msg.sender].push(entryId);
            entryOwner[raffleId][entryId] = msg.sender; // O(1) winner lookup
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
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_gasLane,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        vrfRequestToRaffleId[requestId] = raffleId;
        
        emit WinnerRequested(raffleId, requestId);
    }

    /**
     * @dev Chainlink VRF callback
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 raffleId = vrfRequestToRaffleId[requestId];
        RaffleInfo storage raffle = raffles[raffleId];

        uint256 winningIndex = randomWords[0] % raffle.ticketsSold;
        uint256 winningEntry = raffle.entries[winningIndex];

        // O(1) winner lookup using entryOwner mapping
        address winner = entryOwner[raffleId][winningEntry];

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
        require(raffle.winner != address(0), "Prize already claimed");

        uint256 totalPrize = raffle.ticketPrice * raffle.ticketsSold;
        uint256 fee = (totalPrize * platformFee) / 100;
        uint256 winnerAmount = totalPrize - fee;

        // CEI pattern: update state before external call
        address winner = raffle.winner;
        raffle.winner = address(0); // Prevent re-claim

        (bool success, ) = payable(winner).call{value: winnerAmount}("");
        require(success, "Transfer failed");

        emit PrizeClaimed(raffleId, winner);
    }

    /**
     * @dev Withdraw funds from contract (owner only)
     * @param amount Amount to withdraw in wei (0 = withdraw all)
     */
    function withdrawFees(uint256 amount) external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        require(withdrawAmount <= balance, "Insufficient balance");
        
        (bool success, ) = payable(owner()).call{value: withdrawAmount}("");
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
     * @dev Get all participants for a raffle
     */
    function getRaffleParticipants(uint256 raffleId) 
        external 
        view 
        returns (address[] memory) 
    {
        return participants[raffleId];
    }
}
