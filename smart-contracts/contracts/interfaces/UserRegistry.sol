// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IUserRegistry {
    event UserRegistered(
        address indexed user,
        string username,
        string metadataURI
    );

    event UsernameUpdated(
        address indexed user,
        string oldUsername,
        string newUsername
    );

    event MetadataURIUpdated(
        address indexed user,
        string oldMetadataURI,
        string newMetadataURI
    );

    function register(
        string memory username,
        string memory metadataURI
    ) external;

    function updateUsername(string memory newUsername) external;

    function updateMetadataURI(string memory newMetadataURI) external;

    function getUser(
        address user
    ) external view returns (string memory username, string memory metadataURI);

    function getAddressByUsername(
        string memory username
    ) external view returns (address user);
}
