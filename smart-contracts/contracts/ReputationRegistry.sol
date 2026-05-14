// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Errors} from "./libs/Errors.sol";

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @dev ERC-8004 Reputation Registry.
contract ReputationRegistry {
    IERC721 private _identityRegistry;

    struct Feedback {
        int128 value;
        uint8 valueDecimals; // 0-18
        string tag1;
        string tag2;
        bool isRevoked;
    }

    // agentId => clientAddress => lastIndex (1-indexed)
    mapping(uint256 agentId => mapping(address client => uint64)) private _lastIndex;

    // agentId => clientAddress => feedbackIndex => Feedback
    mapping(uint256 agentId => mapping(address client => mapping(uint64 idx => Feedback))) private _feedback;

    // agentId => clients list (for optional readAllFeedback usage)
    mapping(uint256 agentId => address[]) private _clients;
    mapping(uint256 agentId => mapping(address client => bool)) private _isClient;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseURI,
        bytes32 responseHash
    );

    function initialize(address identityRegistry_) external {
        require(address(_identityRegistry) == address(0), Errors.ACTION_NOT_ALLOWED);
        require(identityRegistry_ != address(0), Errors.INVALID_INPUT);
        _identityRegistry = IERC721(identityRegistry_);
    }

    function getIdentityRegistry() external view returns (address identityRegistry) {
        return address(_identityRegistry);
    }

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        require(address(_identityRegistry) != address(0), Errors.INTERNAL_ERROR);
        require(valueDecimals <= 18, Errors.INVALID_INPUT);

        address owner = _identityRegistry.ownerOf(agentId); // reverts if invalid agentId

        // MUST NOT be owner or approved operator for agentId
        require(msg.sender != owner, Errors.UNAUTHORIZED);
        require(_identityRegistry.getApproved(agentId) != msg.sender, Errors.UNAUTHORIZED);
        require(!_identityRegistry.isApprovedForAll(owner, msg.sender), Errors.UNAUTHORIZED);

        uint64 next = _lastIndex[agentId][msg.sender] + 1;
        _lastIndex[agentId][msg.sender] = next;

        _feedback[agentId][msg.sender][next] = Feedback({
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        });

        if (!_isClient[agentId][msg.sender]) {
            _isClient[agentId][msg.sender] = true;
            _clients[agentId].push(msg.sender);
        }

        emit NewFeedback(
            agentId,
            msg.sender,
            next,
            value,
            valueDecimals,
            tag1,
            tag1,
            tag2,
            endpoint,
            feedbackURI,
            feedbackHash
        );
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        require(feedbackIndex > 0, Errors.INVALID_INPUT);
        Feedback storage fb = _feedback[agentId][msg.sender][feedbackIndex];
        // If never written, valueDecimals defaults to 0; we treat missing as invalid input by requiring index <= lastIndex
        require(feedbackIndex <= _lastIndex[agentId][msg.sender], Errors.INVALID_INPUT);
        fb.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external {
        require(address(_identityRegistry) != address(0), Errors.INTERNAL_ERROR);
        require(clientAddress != address(0), Errors.INVALID_INPUT);
        require(feedbackIndex > 0, Errors.INVALID_INPUT);
        require(feedbackIndex <= _lastIndex[agentId][clientAddress], Errors.INVALID_INPUT);

        address owner = _identityRegistry.ownerOf(agentId);
        bool ok = (msg.sender == owner) ||
            (_identityRegistry.getApproved(agentId) == msg.sender) ||
            (_identityRegistry.isApprovedForAll(owner, msg.sender));
        require(ok, Errors.UNAUTHORIZED);

        emit ResponseAppended(
            agentId,
            clientAddress,
            feedbackIndex,
            msg.sender,
            responseURI,
            responseHash
        );
    }

    // EIP-8004: optional; not stored in spec.
    function getResponseCount(
        uint256,
        address,
        uint64,
        address[] calldata
    ) external pure returns (uint64 count) {
        return 0;
    }

    function getLastIndex(
        uint256 agentId,
        address clientAddress
    ) external view returns (uint64) {
        return _lastIndex[agentId][clientAddress];
    }

    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    )
        external
        view
        returns (
            int128 value,
            uint8 valueDecimals,
            string memory tag1,
            string memory tag2,
            bool isRevoked
        )
    {
        Feedback storage fb = _feedback[agentId][clientAddress][feedbackIndex];
        return (fb.value, fb.valueDecimals, fb.tag1, fb.tag2, fb.isRevoked);
    }

    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        require(clientAddresses.length > 0, Errors.INVALID_INPUT);

        // Normalize to 18 decimals for summary.
        int256 sum18 = 0;
        uint64 n = 0;

        for (uint256 i = 0; i < clientAddresses.length; i++) {
            address client = clientAddresses[i];
            uint64 last = _lastIndex[agentId][client];
            for (uint64 idx = 1; idx <= last; idx++) {
                Feedback storage fb = _feedback[agentId][client][idx];
                if (fb.isRevoked) continue;
                if (bytes(tag1).length != 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length != 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;

                int256 v = int256(fb.value);
                uint8 d = fb.valueDecimals;
                if (d < 18) {
                    v = v * int256(10 ** (18 - d));
                } else if (d > 18) {
                    v = v / int256(10 ** (d - 18));
                }

                sum18 += v;
                n++;
            }
        }

        if (n == 0) {
            return (0, 0, 18);
        }

        int256 avg18 = sum18 / int256(uint256(n));
        require(avg18 <= type(int128).max && avg18 >= type(int128).min, Errors.OPERATION_FAILED);
        return (n, int128(avg18), 18);
    }

    function readAllFeedback(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2,
        bool includeRevoked
    )
        external
        view
        returns (
            address[] memory clients,
            uint64[] memory feedbackIndexes,
            int128[] memory values,
            uint8[] memory valueDecimals,
            string[] memory tag1s,
            string[] memory tag2s,
            bool[] memory revokedStatuses
        )
    {
        address[] memory src;
        if (clientAddresses.length == 0) {
            address[] storage stored = _clients[agentId];
            src = new address[](stored.length);
            for (uint256 i = 0; i < stored.length; i++) {
                src[i] = stored[i];
            }
        } else {
            src = new address[](clientAddresses.length);
            for (uint256 i = 0; i < clientAddresses.length; i++) {
                src[i] = clientAddresses[i];
            }
        }

        // 1) count
        uint256 total = 0;
        for (uint256 i = 0; i < src.length; i++) {
            uint64 last = _lastIndex[agentId][src[i]];
            for (uint64 idx = 1; idx <= last; idx++) {
                Feedback storage fb = _feedback[agentId][src[i]][idx];
                if (!includeRevoked && fb.isRevoked) continue;
                if (bytes(tag1).length != 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length != 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;
                total++;
            }
        }

        clients = new address[](total);
        feedbackIndexes = new uint64[](total);
        values = new int128[](total);
        valueDecimals = new uint8[](total);
        tag1s = new string[](total);
        tag2s = new string[](total);
        revokedStatuses = new bool[](total);

        // 2) fill
        uint256 k = 0;
        for (uint256 i = 0; i < src.length; i++) {
            address client = src[i];
            uint64 last = _lastIndex[agentId][client];
            for (uint64 idx = 1; idx <= last; idx++) {
                Feedback storage fb = _feedback[agentId][client][idx];
                if (!includeRevoked && fb.isRevoked) continue;
                if (bytes(tag1).length != 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length != 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;

                clients[k] = client;
                feedbackIndexes[k] = idx;
                values[k] = fb.value;
                valueDecimals[k] = fb.valueDecimals;
                tag1s[k] = fb.tag1;
                tag2s[k] = fb.tag2;
                revokedStatuses[k] = fb.isRevoked;
                k++;
            }
        }
    }
}

