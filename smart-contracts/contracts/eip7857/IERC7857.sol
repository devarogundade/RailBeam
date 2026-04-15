// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IERC7857 {
    // Transfer with metadata re-encryption
    function transfer(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external;

    // Clone token with same metadata
    function clone(
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external returns (uint256 newTokenId);

    // Authorize usage without revealing data
    function authorizeUsage(
        uint256 tokenId,
        address executor,
        bytes calldata permissions
    ) external;
}
