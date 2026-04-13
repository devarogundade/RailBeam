// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Errors} from "../libs/Errors.sol";

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

/// @dev ERC-8004 Identity Registry (subset) for agent discovery.
/// - ERC-721 + URIStorage (agentId = tokenId, agentURI = tokenURI)
/// - Optional key/value metadata per agentId (bytes)
/// - Reserved key `agentWallet` with wallet-control verification via EIP-712 signatures (EOA) or ERC-1271 (contract)
contract IdentityRegistry is ERC721URIStorage, EIP712 {
    using ECDSA for bytes32;

    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );

    bytes32 private constant SET_AGENT_WALLET_TYPEHASH =
        keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");

    bytes32 private constant KEY_AGENT_WALLET = keccak256(bytes("agentWallet"));

    uint256 private _lastAgentId;

    mapping(uint256 agentId => mapping(bytes32 keyHash => bytes)) private _metadata;
    mapping(uint256 agentId => address) private _agentWallet;

    constructor() ERC721("ERC-8004 Agents", "AGENT") EIP712("ERC-8004 Identity Registry", "1") {}

    // ============== ERC-8004: Registration ============== //

    function register(string calldata agentURI) external returns (uint256 agentId) {
        MetadataEntry[] memory empty;
        return _register(agentURI, empty);
    }

    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        MetadataEntry[] memory m = new MetadataEntry[](metadata.length);
        for (uint256 i = 0; i < metadata.length; i++) {
            m[i] = metadata[i];
        }
        return _register(agentURI, m);
    }

    function register() external returns (uint256 agentId) {
        MetadataEntry[] memory empty;
        return _register("", empty);
    }

    function _register(
        string memory agentURI,
        MetadataEntry[] memory metadata
    ) internal returns (uint256 agentId) {
        _lastAgentId++;
        agentId = _lastAgentId;

        _safeMint(msg.sender, agentId);

        if (bytes(agentURI).length > 0) {
            _setTokenURI(agentId, agentURI);
        }

        // Reserved agentWallet: initially set to owner (msg.sender)
        _agentWallet[agentId] = msg.sender;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(msg.sender));

        for (uint256 i = 0; i < metadata.length; i++) {
            _setMetadata(agentId, metadata[i].metadataKey, metadata[i].metadataValue);
        }

        emit Registered(agentId, agentURI, msg.sender);
    }

    // ============== ERC-8004: agentURI updates ============== //

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        _requireAuthorized(agentId);
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    // ============== Optional metadata ============== //

    function getMetadata(
        uint256 agentId,
        string memory metadataKey
    ) external view returns (bytes memory) {
        _requireOwned(agentId);
        bytes32 keyHash = keccak256(bytes(metadataKey));
        return _metadata[agentId][keyHash];
    }

    function setMetadata(
        uint256 agentId,
        string calldata metadataKey,
        bytes calldata metadataValue
    ) external {
        _requireAuthorized(agentId);
        _setMetadata(agentId, metadataKey, metadataValue);
    }

    function _setMetadata(
        uint256 agentId,
        string memory metadataKey,
        bytes memory metadataValue
    ) internal {
        bytes32 keyHash = keccak256(bytes(metadataKey));
        require(keyHash != KEY_AGENT_WALLET, Errors.ACTION_NOT_ALLOWED);
        _metadata[agentId][keyHash] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    // ============== Reserved agentWallet ============== //

    function getAgentWallet(uint256 agentId) external view returns (address) {
        _requireOwned(agentId);
        return _agentWallet[agentId];
    }

    function unsetAgentWallet(uint256 agentId) external {
        _requireAuthorized(agentId);
        _agentWallet[agentId] = address(0);
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(address(0)));
    }

    /// @notice Set the agent wallet after proving control of `newWallet`.
    /// @dev Signature MUST be produced by `newWallet` (EOA) or validated via ERC-1271 (contract wallet).
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        _requireAuthorized(agentId);
        require(newWallet != address(0), Errors.INVALID_INPUT);
        require(block.timestamp <= deadline, Errors.SIGNATURE_EXPIRED);

        bytes32 structHash = keccak256(
            abi.encode(SET_AGENT_WALLET_TYPEHASH, agentId, newWallet, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        if (newWallet.code.length == 0) {
            address recovered = digest.recover(signature);
            require(recovered == newWallet, Errors.INVALID_SIGNATURE);
        } else {
            bytes4 magic = IERC1271(newWallet).isValidSignature(digest, signature);
            require(magic == IERC1271.isValidSignature.selector, Errors.INVALID_SIGNATURE);
        }

        _agentWallet[agentId] = newWallet;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(newWallet));
    }

    // ============== Internals ============== //

    function _requireAuthorized(uint256 agentId) internal view {
        address owner = ownerOf(agentId);
        // Uses ERC721 internal auth checks (owner/operator/token approval)
        _checkAuthorized(owner, msg.sender, agentId);
    }

    /// @dev Clear agentWallet on transfer, as per ERC-8004.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721) returns (address from) {
        from = super._update(to, tokenId, auth);
        if (from != address(0) && to != from) {
            _agentWallet[tokenId] = address(0);
            emit MetadataSet(tokenId, "agentWallet", "agentWallet", abi.encode(address(0)));
        }
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

