// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Types} from "../libs/Types.sol";
import {Params} from "../libs/Params.sol";

import {AddressLib} from "../libs/AddressLib.sol";
import {IntegerLib} from "../libs/IntegerLib.sol";

import {Errors} from "../libs/Errors.sol";

import {IWallet} from "../interfaces/IWallet.sol";
import {IMerchant} from "../interfaces/IMerchant.sol";
import {IBeam} from "../interfaces/IBeam.sol";
import {IHookManager} from "../interfaces/IHookManager.sol";
import {IOneTimeTransaction} from "../interfaces/IOneTimeTransaction.sol";
import {IRecurrentTransaction} from "../interfaces/IRecurrentTransaction.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Beam is Ownable, IBeam {
    using SafeERC20 for IERC20;

    IMerchant internal _merchant;
    IHookManager internal _hookManager;
    IOneTimeTransaction internal _oneTimeTransaction;
    IRecurrentTransaction internal _recurrentTransaction;

    constructor(
        IMerchant merchant_,
        IOneTimeTransaction oneTimeTransaction_,
        IRecurrentTransaction recurrentTransaction_,
        IHookManager hookManager_
    ) Ownable(msg.sender) {
        _merchant = merchant_;
        _oneTimeTransaction = oneTimeTransaction_;
        _recurrentTransaction = recurrentTransaction_;
        _hookManager = hookManager_;
    }

    // ============== External Functions ============== //

    function oneTimeTransaction(
        Params.CreateOneTimeTransaction memory params
    ) external payable {
        AddressLib.requireOne(params.merchant);
        AddressLib.requireEvery(params.payers);
        IntegerLib.requireEvery(params.amounts);

        bytes32 transactionId = _oneTimeTransaction.create(msg.sender, params);

        (bool completed, uint256 amount) = _oneTimeTransaction.onFulfill(
            transactionId,
            msg.sender
        );

        address wallet = _merchant.getWallet(params.merchant);
        AddressLib.requireOne(wallet);

        Params.BeforePayment memory beforePaymentParams = Params.BeforePayment({
            merchant: params.merchant,
            payer: msg.sender,
            token: params.token,
            amount: amount
        });

        _hookManager.beforePayment(beforePaymentParams);

        Params.AdjustTokenAmount memory adjustTokenAmountParams = Params
            .AdjustTokenAmount({
                merchant: params.merchant,
                payer: msg.sender,
                token: params.token,
                amount: amount
            });

        (address adjustedToken, uint256 adjustedAmount) = _hookManager
            .adjustTokenAmount(adjustTokenAmountParams);

        Params.RouteTransaction memory routeParams = Params.RouteTransaction({
            token: adjustedToken,
            amount: adjustedAmount,
            wallet: wallet
        });

        _routeTransaction(routeParams);

        IWallet(wallet).deposit{value: msg.value}(
            adjustedToken,
            adjustedAmount
        );

        if (completed) _oneTimeTransaction.onComplete(transactionId);

        Params.AfterPayment memory afterPaymentParams = Params.AfterPayment({
            merchant: params.merchant,
            transactionId: transactionId,
            payer: msg.sender,
            token: params.token,
            amount: amount,
            adjustedToken: adjustedToken,
            adjustedAmount: adjustedAmount
        });

        _hookManager.afterPayment(afterPaymentParams);

        emit OneTimeTransactionCreated(
            transactionId,
            msg.sender,
            params.payers,
            params.merchant,
            params.token,
            params.amounts,
            adjustedToken,
            adjustedAmount,
            block.timestamp,
            params.description,
            params.metadata,
            _oneTimeTransaction.getStatus(transactionId)
        );
    }

    function fulfillOneTimeTransaction(
        Params.FulfillOneTimeTransaction memory params
    ) external payable {
        (bool completed, uint256 amount) = _oneTimeTransaction.onFulfill(
            params.transactionId,
            msg.sender
        );

        Types.OneTimeTransaction memory transaction = _oneTimeTransaction
            .getTransaction(params.transactionId);

        address wallet = _merchant.getWallet(transaction.merchant);
        AddressLib.requireOne(wallet);

        Params.BeforePayment memory beforePaymentParams = Params.BeforePayment({
            merchant: transaction.merchant,
            payer: msg.sender,
            token: transaction.token,
            amount: amount
        });

        _hookManager.beforePayment(beforePaymentParams);

        Params.AdjustTokenAmount memory adjustTokenAmountParams = Params
            .AdjustTokenAmount({
                merchant: transaction.merchant,
                payer: msg.sender,
                token: transaction.token,
                amount: amount
            });

        (address adjustedToken, uint256 adjustedAmount) = _hookManager
            .adjustTokenAmount(adjustTokenAmountParams);

        Params.RouteTransaction memory routeParams = Params.RouteTransaction({
            token: adjustedToken,
            amount: adjustedAmount,
            wallet: wallet
        });

        _routeTransaction(routeParams);

        IWallet(wallet).deposit{value: msg.value}(
            adjustedToken,
            adjustedAmount
        );

        if (completed) _oneTimeTransaction.onComplete(params.transactionId);

        Params.AfterPayment memory afterPaymentParams = Params.AfterPayment({
            merchant: transaction.merchant,
            transactionId: params.transactionId,
            payer: msg.sender,
            token: transaction.token,
            amount: amount,
            adjustedToken: adjustedToken,
            adjustedAmount: adjustedAmount
        });

        _hookManager.afterPayment(afterPaymentParams);

        emit OneTimeTransactionFulfilled(
            params.transactionId,
            msg.sender,
            transaction.merchant,
            transaction.token,
            amount,
            adjustedToken,
            adjustedAmount,
            block.timestamp,
            _oneTimeTransaction.getStatus(params.transactionId)
        );
    }

    function recurrentTransaction(
        Params.CreateRecurrentTransaction memory params
    ) external payable {
        AddressLib.requireOne(params.merchant);

        bytes32 transactionId = _recurrentTransaction.create(
            msg.sender,
            params
        );

        (uint256 amount, address token, uint256 dueDate) = _recurrentTransaction
            .onFulfill(transactionId, msg.sender);

        address wallet = _merchant.getWallet(params.merchant);
        AddressLib.requireOne(wallet);

        Params.BeforePayment memory beforePaymentParams = Params.BeforePayment({
            merchant: params.merchant,
            payer: msg.sender,
            token: token,
            amount: amount
        });

        _hookManager.beforePayment(beforePaymentParams);

        Params.AdjustTokenAmount memory adjustTokenAmountParams = Params
            .AdjustTokenAmount({
                merchant: params.merchant,
                payer: msg.sender,
                token: token,
                amount: amount
            });

        (address adjustedToken, uint256 adjustedAmount) = _hookManager
            .adjustTokenAmount(adjustTokenAmountParams);

        Params.RouteTransaction memory routeParams = Params.RouteTransaction({
            token: adjustedToken,
            amount: adjustedAmount,
            wallet: wallet
        });

        _routeTransaction(routeParams);

        IWallet(wallet).deposit{value: msg.value}(
            adjustedToken,
            adjustedAmount
        );

        _recurrentTransaction.onComplete(transactionId, amount);

        Params.AfterPayment memory afterPaymentParams = Params.AfterPayment({
            merchant: params.merchant,
            transactionId: transactionId,
            payer: msg.sender,
            token: token,
            amount: amount,
            adjustedToken: adjustedToken,
            adjustedAmount: adjustedAmount
        });

        _hookManager.afterPayment(afterPaymentParams);

        emit RecurrentTransactionCreated(
            transactionId,
            msg.sender,
            params.merchant,
            params.subscriptionId,
            dueDate,
            token,
            amount,
            adjustedToken,
            adjustedAmount,
            block.timestamp,
            params.description,
            params.metadata,
            _recurrentTransaction.getStatus(transactionId)
        );
    }

    function fulfillRecurrentTransaction(
        Params.FulfillRecurrentTransaction memory params
    ) external payable {
        (uint256 amount, address token, uint256 dueDate) = _recurrentTransaction
            .onFulfill(params.transactionId, msg.sender);

        Types.RecurrentTransaction memory transaction = _recurrentTransaction
            .getTransaction(params.transactionId);

        address wallet = _merchant.getWallet(transaction.merchant);
        AddressLib.requireOne(wallet);

        Params.BeforePayment memory beforePaymentParams = Params.BeforePayment({
            merchant: transaction.merchant,
            payer: msg.sender,
            token: token,
            amount: amount
        });

        _hookManager.beforePayment(beforePaymentParams);

        Params.AdjustTokenAmount memory adjustTokenAmountParams = Params
            .AdjustTokenAmount({
                merchant: transaction.merchant,
                payer: msg.sender,
                token: token,
                amount: amount
            });

        (address adjustedToken, uint256 adjustedAmount) = _hookManager
            .adjustTokenAmount(adjustTokenAmountParams);

        Params.RouteTransaction memory routeParams = Params.RouteTransaction({
            token: adjustedToken,
            amount: adjustedAmount,
            wallet: wallet
        });

        _routeTransaction(routeParams);

        IWallet(wallet).deposit{value: msg.value}(
            adjustedToken,
            adjustedAmount
        );

        _recurrentTransaction.onComplete(params.transactionId, amount);

        Params.AfterPayment memory afterPaymentParams = Params.AfterPayment({
            merchant: transaction.merchant,
            transactionId: params.transactionId,
            payer: msg.sender,
            token: token,
            amount: amount,
            adjustedToken: adjustedToken,
            adjustedAmount: adjustedAmount
        });

        _hookManager.afterPayment(afterPaymentParams);

        emit RecurrentTransactionFulfilled(
            params.transactionId,
            msg.sender,
            transaction.merchant,
            transaction.subscriptionId,
            dueDate,
            token,
            amount,
            adjustedToken,
            adjustedAmount,
            block.timestamp,
            _recurrentTransaction.getStatus(params.transactionId)
        );
    }

    function cancelRecurrentTransaction(
        Params.CancelRecurrentTransaction memory params
    ) external {
        _recurrentTransaction.onCancel(msg.sender, params.transactionId);

        emit RecurrentTransactionCancelled(params.transactionId);
    }

    // ============== Internal Functions ============== //

    function _routeTransaction(Params.RouteTransaction memory params) internal {
        uint256 balance;

        if (params.token == address(0)) {
            balance = msg.value;
        } else {
            balance = IERC20(params.token).balanceOf(msg.sender);
        }

        require(balance >= params.amount, Errors.TRANSACTION_FAILED);

        if (params.token == address(0)) {
            require(msg.value >= params.amount, Errors.TRANSACTION_FAILED);
        } else {
            IERC20(params.token).safeTransferFrom(
                msg.sender,
                address(this),
                params.amount
            );

            IERC20(params.token).forceApprove(params.wallet, params.amount);
        }
    }
}
