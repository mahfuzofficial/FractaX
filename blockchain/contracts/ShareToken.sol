// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract ShareToken is ERC1155, Ownable, Pausable {

    mapping(uint256 => uint256) public totalSupply;

    event SharesMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 amount,
        string assetDbId
    );

    event SharesTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 amount,
        string transactionDbId
    );

    constructor() ERC1155("") {}

    function mintShares(
        address to,
        uint256 tokenId,
        uint256 amount,
        string calldata assetDbId
    ) external onlyOwner whenNotPaused {
        _mint(to, tokenId, amount, "");
        totalSupply[tokenId] += amount;
        emit SharesMinted(tokenId, to, amount, assetDbId);
    }

    function adminTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        string calldata transactionDbId
    ) external onlyOwner whenNotPaused {
        _safeTransferFrom(from, to, tokenId, amount, "");
        emit SharesTransferred(tokenId, from, to, amount, transactionDbId);
    }

    function burnShares(
        address from,
        uint256 tokenId,
        uint256 amount
    ) external onlyOwner {
        _burn(from, tokenId, amount);
        totalSupply[tokenId] -= amount;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}