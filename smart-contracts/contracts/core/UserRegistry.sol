// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IUserRegistry} from "../interfaces/UserRegistry.sol";
import {Errors} from "../libs/Errors.sol";

contract UserRegistry is IUserRegistry {
    mapping(address => string) private _users;
    mapping(string => address) private _usernames;
    mapping(address => string) private _metadataURIs;

    function register(
        string memory username,
        string memory metadataURI
    ) external {
        require(bytes(username).length > 0, Errors.INVALID_USERNAME);
        require(bytes(metadataURI).length > 0, Errors.INVALID_METADATA_URI);
        require(bytes(_users[msg.sender]).length == 0, Errors.USER_ALREADY_REGISTERED);
        require(
            _usernames[username] == address(0),
            Errors.USERNAME_ALREADY_TAKEN
        );

        _users[msg.sender] = username;
        _metadataURIs[msg.sender] = metadataURI;
        _usernames[username] = msg.sender;

        emit UserRegistered(msg.sender, username, metadataURI);
    }

    function updateUsername(string memory newUsername) external {
        require(bytes(_users[msg.sender]).length > 0, Errors.USER_NOT_REGISTERED);
        require(bytes(newUsername).length > 0, Errors.INVALID_USERNAME);

        string memory oldUsername = _users[msg.sender];
        if (keccak256(bytes(oldUsername)) == keccak256(bytes(newUsername))) {
            return;
        }

        require(_usernames[newUsername] == address(0), Errors.USERNAME_ALREADY_TAKEN);

        delete _usernames[oldUsername];
        _usernames[newUsername] = msg.sender;
        _users[msg.sender] = newUsername;

        emit UsernameUpdated(msg.sender, oldUsername, newUsername);
    }

    function updateMetadataURI(string memory newMetadataURI) external {
        require(bytes(_users[msg.sender]).length > 0, Errors.USER_NOT_REGISTERED);
        require(bytes(newMetadataURI).length > 0, Errors.INVALID_METADATA_URI);

        string memory oldMetadataURI = _metadataURIs[msg.sender];
        if (keccak256(bytes(oldMetadataURI)) == keccak256(bytes(newMetadataURI))) {
            return;
        }

        _metadataURIs[msg.sender] = newMetadataURI;
        emit MetadataURIUpdated(msg.sender, oldMetadataURI, newMetadataURI);
    }

    function getUser(
        address user
    )
        external
        view
        returns (string memory username, string memory metadataURI)
    {
        return (_users[user], _metadataURIs[user]);
    }

    function getAddressByUsername(
        string memory username
    ) external view returns (address user) {
        return _usernames[username];
    }
}
