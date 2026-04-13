// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Types} from "../libs/Types.sol";
import {IHook} from "../interfaces/IHook.sol";

contract MockHook is IHook {
    Types.HookConfig private _config;

    // Call tracking
    uint256 public beforeCount;
    uint256 public afterCount;

    // Last values
    address public lastBeforePayer;
    address public lastBeforeToken;
    uint256 public lastBeforeAmount;

    bytes32 public lastAfterTransactionId;
    address public lastAfterPayer;
    address public lastAfterToken;
    uint256 public lastAfterAmount;
    address public lastAfterAdjustedToken;
    uint256 public lastAfterAdjustedAmount;

    // Adjustment behavior
    address public adjustedToken;
    uint256 public adjustedAmount;

    constructor(
        bool onBeforePayment_,
        bool onAfterPayment_,
        bool onAdjustTokenAmount_
    ) {
        _config = Types.HookConfig({
            onBeforePayment: onBeforePayment_,
            onAfterPayment: onAfterPayment_,
            onAdjustTokenAmount: onAdjustTokenAmount_
        });
    }

    function setAdjust(address token, uint256 amount) external {
        adjustedToken = token;
        adjustedAmount = amount;
    }

    function onRegister() external view override returns (Types.HookConfig memory) {
        return _config;
    }

    function onUnRegister() external override {}

    function onBeforePayment(
        address payer,
        address token,
        uint256 amount
    ) external override {
        beforeCount++;
        lastBeforePayer = payer;
        lastBeforeToken = token;
        lastBeforeAmount = amount;
    }

    function onAfterPayment(
        bytes32 transactionId,
        address payer,
        address token,
        uint256 amount,
        address adjToken,
        uint256 adjAmount
    ) external override {
        afterCount++;
        lastAfterTransactionId = transactionId;
        lastAfterPayer = payer;
        lastAfterToken = token;
        lastAfterAmount = amount;
        lastAfterAdjustedToken = adjToken;
        lastAfterAdjustedAmount = adjAmount;
    }

    function onAdjustTokenAmount(
        address,
        address token,
        uint256 amount
    ) external view override returns (address, uint256) {
        if (adjustedToken != address(0) || adjustedAmount != 0) {
            return (adjustedToken, adjustedAmount);
        }
        return (token, amount);
    }
}

