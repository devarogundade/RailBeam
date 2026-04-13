// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Enums} from "../libs/Enums.sol";
import {Types} from "../libs/Types.sol";
import {Params} from "../libs/Params.sol";

/// @dev Transaction lifecycle events emitted by `Beam`.
interface IBeam {
    event OneTimeTransactionCreated(
        bytes32 transactionId,
        address payer,
        address[] payers,
        address merchant,
        address token,
        uint256[] amounts,
        address adjustedToken,
        uint256 adjustedAmount,
        uint256 timestamp,
        string description,
        Types.Metadata metadata,
        Enums.TransactionStatus status
    );

    event OneTimeTransactionFulfilled(
        bytes32 transactionId,
        address payer,
        address merchant,
        address token,
        uint256 amount,
        address adjustedToken,
        uint256 adjustedAmount,
        uint256 timestamp,
        Enums.TransactionStatus status
    );

    event RecurrentTransactionCreated(
        bytes32 transactionId,
        address payer,
        address merchant,
        bytes32 subscriptionId,
        uint256 dueDate,
        address token,
        uint256 amount,
        address adjustedToken,
        uint256 adjustedAmount,
        uint256 timestamp,
        string description,
        Types.Metadata metadata,
        Enums.TransactionStatus status
    );

    event RecurrentTransactionFulfilled(
        bytes32 transactionId,
        address payer,
        address merchant,
        bytes32 subscriptionId,
        uint256 dueDate,
        address token,
        uint256 amount,
        address adjustedToken,
        uint256 adjustedAmount,
        uint256 timestamp,
        Enums.TransactionStatus status
    );

    event RecurrentTransactionCancelled(bytes32 transactionId);

    function oneTimeTransaction(
        Params.CreateOneTimeTransaction memory params
    ) external payable;

    function fulfillOneTimeTransaction(
        Params.FulfillOneTimeTransaction memory params
    ) external payable;

    function recurrentTransaction(
        Params.CreateRecurrentTransaction memory params
    ) external payable;

    function fulfillRecurrentTransaction(
        Params.FulfillRecurrentTransaction memory params
    ) external payable;

    function cancelRecurrentTransaction(
        Params.CancelRecurrentTransaction memory params
    ) external;
}
