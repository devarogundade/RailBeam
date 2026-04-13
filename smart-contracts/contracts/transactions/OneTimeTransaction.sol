// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Enums} from "../libs/Enums.sol";
import {Types} from "../libs/Types.sol";
import {Params} from "../libs/Params.sol";
import {BoolLib} from "../libs/BoolLib.sol";
import {HashLib} from "../libs/HashLib.sol";
import {Errors} from "../libs/Errors.sol";

import {IReceipt} from "../interfaces/IReceipt.sol";
import {IOneTimeTransaction} from "../interfaces/IOneTimeTransaction.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract OneTimeTransaction is IOneTimeTransaction, Ownable {
    IReceipt internal _receipt;
    uint256 internal _lastTransactionId;
    mapping(bytes32 => Types.OneTimeTransaction) internal _transactions;

    string internal constant BASE_HASH_SELECTOR = "OneTimeTransaction";

    constructor(IReceipt receipt_) Ownable(msg.sender) {
        _receipt = receipt_;
    }

    // ================= Transaction Functions ================= //

    function create(
        address payer,
        Params.CreateOneTimeTransaction memory params
    ) external onlyOwner returns (bytes32 transactionId) {
        _lastTransactionId = _lastTransactionId + 1;

        Types.OneTimeTransaction memory transaction = Types.OneTimeTransaction({
            payer: payer,
            payers: params.payers,
            merchant: params.merchant,
            amounts: params.amounts,
            fulfillments: new bool[](params.payers.length),
            token: params.token,
            timestamps: new uint256[](params.payers.length),
            description: params.description,
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
    ) external onlyOwner returns (bool completed, uint256 amount) {
        Types.OneTimeTransaction storage t = _transactions[transactionId];

        require(
            t.status == Enums.TransactionStatus.Active,
            Errors.TRANSACTION_NOT_ACTIVE
        );

        uint256 payerIndex = _requirePayerAllowed(t, payer);

        require(!t.fulfillments[payerIndex], Errors.ACTION_NOT_ALLOWED);

        t.timestamps[payerIndex] = block.timestamp;
        t.fulfillments[payerIndex] = true;

        completed = BoolLib.every(t.fulfillments);
        amount = t.amounts[payerIndex];
    }

    function onComplete(bytes32 transactionId) external onlyOwner {
        Types.OneTimeTransaction storage t = _transactions[transactionId];

        require(
            t.status == Enums.TransactionStatus.Active,
            Errors.TRANSACTION_NOT_ACTIVE
        );

        require(BoolLib.every(t.fulfillments));

        t.status = Enums.TransactionStatus.Completed;
    }

    function mintReceipt(Params.MintReceipt memory params) external {
        Types.OneTimeTransaction storage t = _transactions[
            params.transactionId
        ];

        _requirePayerAllowed(t, msg.sender);

        require(
            t.status == Enums.TransactionStatus.Completed,
            Errors.TRANSACTION_NOT_COMPLETED
        );

        _receipt.mint(params);
    }

    // ================= Query Functions ================= //

    function getTransaction(
        bytes32 transactionId
    ) public view returns (Types.OneTimeTransaction memory) {
        return _transactions[transactionId];
    }

    function getStatus(
        bytes32 transactionId
    ) public view returns (Enums.TransactionStatus) {
        return _transactions[transactionId].status;
    }

    // ================= Internal Functions ================= //

    function _requirePayerAllowed(
        Types.OneTimeTransaction storage transaction,
        address payer
    ) internal view returns (uint256) {
        uint256 payerIndex;
        bool isPayer = false;

        uint256 len = transaction.payers.length;
        for (uint256 index = 0; index < len; index++) {
            if (payer == transaction.payers[index]) {
                payerIndex = index;
                isPayer = true;
                break;
            }
        }

        require(isPayer, Errors.TRANSACTION_INVALID_PAYER);

        return payerIndex;
    }
}
