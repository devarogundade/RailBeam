// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @dev Revert reason strings for registries (aligned with main smart-contracts numeric codes).
library Errors {
    string public constant UNAUTHORIZED = "2";
    string public constant INVALID_INPUT = "3";
    string public constant ACTION_NOT_ALLOWED = "4";
    string public constant OPERATION_FAILED = "6";
    string public constant INTERNAL_ERROR = "500";
    string public constant INVALID_SIGNATURE = "600";
    string public constant SIGNATURE_EXPIRED = "601";
}
