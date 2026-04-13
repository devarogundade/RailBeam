// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Enums} from "../libs/Enums.sol";
import {Types} from "../libs/Types.sol";
import {Params} from "../libs/Params.sol";
import {HashLib} from "../libs/HashLib.sol";
import {Errors} from "../libs/Errors.sol";

import {IReceipt} from "../interfaces/IReceipt.sol";
import {IMerchant} from "../interfaces/IMerchant.sol";
import {IRecurrentTransaction} from "../interfaces/IRecurrentTransaction.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RecurrentTransaction is IRecurrentTransaction, Ownable {
    IReceipt internal _receipt;
    IMerchant internal _merchant;
    uint256 internal _lastTransactionId;
    mapping(bytes32 => Types.RecurrentTransaction) internal _transactions;

    string internal constant BASE_HASH_SELECTOR = "RecurrentTransaction";

    constructor(IReceipt receipt_, IMerchant merchant_) Ownable(msg.sender) {
        _receipt = receipt_;
        _merchant = merchant_;
    }

    // ================= Transaction Functions ================= //

    function create(
        address payer,
        Params.CreateRecurrentTransaction memory params
    ) external onlyOwner returns (bytes32 transactionId) {
        _lastTransactionId = _lastTransactionId + 1;

        Types.RecurrentTransaction memory transaction = Types
            .RecurrentTransaction({
                payer: payer,
                merchant: params.merchant,
                subscriptionId: params.subscriptionId,
                description: params.description,
                timestamps: new uint256[](0),
                amounts: new uint256[](0),
                dueDate: block.timestamp,
                metadata: params.metadata,
                status: Enums.TransactionStatus.Active
            });

        transactionId = HashLib.generate(
            BASE_HASH_SELECTOR,
            _lastTransactionId
        );
        _transactions[transactionId] = transaction;
    }

    function onFulfill(
        bytes32 transactionId,
        address payer
    )
        external
        onlyOwner
        returns (uint256 amount, address token, uint256 dueDate)
    {
        require(
            _transactions[transactionId].status ==
                Enums.TransactionStatus.Active,
            Errors.TRANSACTION_NOT_ACTIVE
        );
        Types.RecurrentTransaction storage t = _transactions[transactionId];

        require(t.payer == payer, Errors.TRANSACTION_INVALID_PAYER);

        require(block.timestamp >= t.dueDate, Errors.RECURRENT_PAYMENT_NOT_DUE);

        Types.Subscription memory subscription = _merchant.getSubscription(
            t.subscriptionId
        );

        require(subscription.active, Errors.SUBSCRIPTION_INACTIVE);
        require(subscription.merchant == t.merchant, Errors.UNAUTHORIZED);
        require(subscription.interval != 0, Errors.INVALID_INPUT);

        if (block.timestamp > t.dueDate) {
            dueDate = block.timestamp;
        } else {
            dueDate = t.dueDate;
        }

        dueDate = dueDate + subscription.interval;

        t.dueDate = dueDate;

        amount = subscription.amount;
        token = subscription.token;
    }

    function onComplete(
        bytes32 transactionId,
        uint256 amount
    ) external onlyOwner {
        require(
            _transactions[transactionId].status ==
                Enums.TransactionStatus.Active,
            Errors.TRANSACTION_NOT_ACTIVE
        );

        _transactions[transactionId].timestamps.push(block.timestamp);
        _transactions[transactionId].amounts.push(amount);
    }

    function onCancel(address payer, bytes32 transactionId) external onlyOwner {
        require(
            _transactions[transactionId].status ==
                Enums.TransactionStatus.Active,
            Errors.TRANSACTION_NOT_ACTIVE
        );
        require(
            _transactions[transactionId].payer == payer,
            Errors.TRANSACTION_INVALID_PAYER
        );

        _transactions[transactionId].status = Enums.TransactionStatus.Cancelled;
    }

    function mintReceipt(Params.MintReceipt memory params) external {
        Types.RecurrentTransaction storage t = _transactions[
            params.transactionId
        ];

        require(t.payer == msg.sender, Errors.TRANSACTION_INVALID_PAYER);
        require(
            t.status == Enums.TransactionStatus.Completed,
            Errors.TRANSACTION_NOT_COMPLETED
        );

        _receipt.mint(params);
    }

    // ================= Query Functions ================= //

    function getTransaction(
        bytes32 transactionId
    ) public view returns (Types.RecurrentTransaction memory) {
        return _transactions[transactionId];
    }

    function getStatus(
        bytes32 transactionId
    ) public view returns (Enums.TransactionStatus) {
        return _transactions[transactionId].status;
    }
}
