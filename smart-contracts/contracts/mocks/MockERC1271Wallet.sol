// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MockERC1271Wallet is IERC1271 {
    using ECDSA for bytes32;

    address public immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) external view override returns (bytes4 magicValue) {
        address recovered = hash.recover(signature);
        if (recovered == owner) return IERC1271.isValidSignature.selector;
        return 0xffffffff;
    }
}

