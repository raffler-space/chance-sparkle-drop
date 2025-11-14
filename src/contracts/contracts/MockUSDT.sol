// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT token for testing purposes on Sepolia testnet
 * Allows anyone to mint tokens for testing the raffle system
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private _decimals;

    constructor() ERC20("Mock USDT", "mUSDT") Ownable(msg.sender) {
        _decimals = 6; // USDT uses 6 decimals
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10**_decimals); // 1 million tokens
    }

    /**
     * @dev Returns the number of decimals used to get its user representation
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Public mint function for testing - allows anyone to mint test tokens
     * In production, this would be restricted or removed
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @dev Mint tokens with proper decimals
     * Example: mintWithDecimals(userAddress, 100) mints 100 USDT
     */
    function mintWithDecimals(address to, uint256 amount) public {
        _mint(to, amount * 10**_decimals);
    }
}
