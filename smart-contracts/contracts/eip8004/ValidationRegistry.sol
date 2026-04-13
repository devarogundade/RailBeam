// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Errors} from "../libs/Errors.sol";

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @dev ERC-8004 Validation Registry.
contract ValidationRegistry {
    IERC721 private _identityRegistry;

    struct ValidationStatus {
        address validatorAddress;
        uint256 agentId;
        uint8 response; // 0-100
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
        bool exists;
    }

    mapping(bytes32 requestHash => ValidationStatus) private _status;
    mapping(uint256 agentId => bytes32[] requestHashes) private _agentValidations;
    mapping(address validator => bytes32[] requestHashes) private _validatorRequests;

    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        string requestURI,
        bytes32 indexed requestHash
    );

    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseURI,
        bytes32 responseHash,
        string tag
    );

    function initialize(address identityRegistry_) external {
        require(address(_identityRegistry) == address(0), Errors.ACTION_NOT_ALLOWED);
        require(identityRegistry_ != address(0), Errors.INVALID_INPUT);
        _identityRegistry = IERC721(identityRegistry_);
    }

    function getIdentityRegistry() external view returns (address identityRegistry) {
        return address(_identityRegistry);
    }

    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external {
        require(address(_identityRegistry) != address(0), Errors.INTERNAL_ERROR);
        require(validatorAddress != address(0), Errors.INVALID_INPUT);
        require(requestHash != bytes32(0), Errors.INVALID_INPUT);

        address owner = _identityRegistry.ownerOf(agentId); // reverts if invalid
        // MUST be owner or operator of agentId
        bool ok = (msg.sender == owner) ||
            (_identityRegistry.getApproved(agentId) == msg.sender) ||
            (_identityRegistry.isApprovedForAll(owner, msg.sender));
        require(ok, Errors.UNAUTHORIZED);

        ValidationStatus storage s = _status[requestHash];
        if (!s.exists) {
            s.exists = true;
            s.validatorAddress = validatorAddress;
            s.agentId = agentId;
            s.response = 0;
            s.responseHash = bytes32(0);
            s.tag = "";
            s.lastUpdate = block.timestamp;
            _agentValidations[agentId].push(requestHash);
            _validatorRequests[validatorAddress].push(requestHash);
        } else {
            // If already exists, it must match initial tuple to avoid collisions.
            require(s.validatorAddress == validatorAddress, Errors.ACTION_NOT_ALLOWED);
            require(s.agentId == agentId, Errors.ACTION_NOT_ALLOWED);
            s.lastUpdate = block.timestamp;
        }

        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external {
        require(response <= 100, Errors.INVALID_INPUT);
        ValidationStatus storage s = _status[requestHash];
        require(s.exists, Errors.INVALID_INPUT);
        require(msg.sender == s.validatorAddress, Errors.UNAUTHORIZED);

        s.response = response;
        s.responseHash = responseHash;
        s.tag = tag;
        s.lastUpdate = block.timestamp;

        emit ValidationResponse(
            s.validatorAddress,
            s.agentId,
            requestHash,
            response,
            responseURI,
            responseHash,
            tag
        );
    }

    function getValidationStatus(
        bytes32 requestHash
    )
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 responseHash,
            string memory tag,
            uint256 lastUpdate
        )
    {
        ValidationStatus storage s = _status[requestHash];
        require(s.exists, Errors.INVALID_INPUT);
        return (s.validatorAddress, s.agentId, s.response, s.responseHash, s.tag, s.lastUpdate);
    }

    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tag
    ) external view returns (uint64 count, uint8 averageResponse) {
        bytes32[] storage hashes = _agentValidations[agentId];

        uint256 sum = 0;
        uint64 n = 0;

        for (uint256 i = 0; i < hashes.length; i++) {
            ValidationStatus storage s = _status[hashes[i]];
            if (!s.exists) continue;
            if (validatorAddresses.length != 0 && !_contains(validatorAddresses, s.validatorAddress)) continue;
            if (bytes(tag).length != 0 && keccak256(bytes(s.tag)) != keccak256(bytes(tag))) continue;
            sum += s.response;
            n++;
        }

        if (n == 0) return (0, 0);
        return (n, uint8(sum / uint256(n)));
    }

    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory requestHashes) {
        return _agentValidations[agentId];
    }

    function getValidatorRequests(
        address validatorAddress
    ) external view returns (bytes32[] memory requestHashes) {
        return _validatorRequests[validatorAddress];
    }

    function _contains(address[] calldata arr, address a) internal pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == a) return true;
        }
        return false;
    }
}

