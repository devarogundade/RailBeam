// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {MultiSigWallet} from "./MultiSigWallet.sol";

import {Types} from "../libs/Types.sol";
import {Params} from "../libs/Params.sol";
import {Errors} from "../libs/Errors.sol";
import {HashLib} from "../libs/HashLib.sol";

import {IMerchant} from "../interfaces/IMerchant.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract Merchant is Pausable, Ownable, IMerchant {
    uint256 internal _lastSubscriptionId;
    mapping(bytes32 => Types.Subscription) internal _subscriptions;
    mapping(address => Types.MerchantConfig) internal _merchants;

    string internal constant BASE_HASH_SELECTOR = "Merchant";

    constructor() Ownable(msg.sender) {}

    function create(
        Params.CreateMerchant memory params
    ) external payable override whenNotPaused {
        require(
            _merchants[msg.sender].wallet == address(0),
            Errors.MERCHANT_ALREADY_EXIST
        );

        MultiSigWallet wallet = new MultiSigWallet{value: msg.value}(
            msg.sender,
            params.tokens,
            params.signers,
            params.minSigners
        );

        Types.MerchantConfig memory merchant = Types.MerchantConfig({
            metadata: params.metadata,
            wallet: address(wallet)
        });

        _merchants[msg.sender] = merchant;

        emit MerchantCreated(
            msg.sender,
            params.metadata,
            address(wallet),
            params.tokens,
            params.signers,
            params.minSigners
        );
    }

    function update(
        Params.UpdateMerchant memory params
    ) external override whenNotPaused {
        require(
            _merchants[msg.sender].wallet != address(0),
            Errors.MERCHANT_NOT_FOUND
        );

        Types.MerchantConfig memory merchant = Types.MerchantConfig({
            metadata: params.metadata,
            wallet: _merchants[msg.sender].wallet
        });

        _merchants[msg.sender] = merchant;

        emit MerchantMetadataUpdated(msg.sender, params.metadata);
    }

    function createSubscription(
        Params.CreateSubscription memory params
    ) external override whenNotPaused returns (bytes32 subscriptionId) {
        require(
            _merchants[msg.sender].wallet != address(0),
            Errors.MERCHANT_NOT_FOUND
        );
        require(params.interval != 0, Errors.INVALID_INPUT);

        _lastSubscriptionId = _lastSubscriptionId + 1;

        Types.Subscription memory subscription = Types.Subscription({
            token: params.token,
            interval: params.interval,
            amount: params.amount,
            gracePeriod: params.gracePeriod,
            description: params.description,
            catalogMetadata: params.catalogMetadata,
            merchant: msg.sender,
            active: true
        });

        subscriptionId = HashLib.generateWithAddress(
            BASE_HASH_SELECTOR,
            msg.sender,
            _lastSubscriptionId
        );
        _subscriptions[subscriptionId] = subscription;

        emit SubscriptionCreated(
            subscriptionId,
            msg.sender,
            params.token,
            params.interval,
            params.amount,
            params.gracePeriod,
            params.description,
            params.catalogMetadata
        );
    }

    function updateSubscription(
        Params.UpdateSubscription memory params
    ) external override whenNotPaused {
        require(
            _merchants[msg.sender].wallet != address(0),
            Errors.MERCHANT_NOT_FOUND
        );

        Types.Subscription storage subscription = _subscriptions[
            params.subscriptionId
        ];

        require(subscription.merchant == msg.sender, Errors.UNAUTHORIZED);

        subscription.amount = params.amount;
        subscription.gracePeriod = params.gracePeriod;
        subscription.description = params.description;
        subscription.catalogMetadata = params.catalogMetadata;
        subscription.active = params.active;

        emit SubscriptionUpdated(
            params.subscriptionId,
            params.amount,
            params.gracePeriod,
            params.description,
            params.catalogMetadata,
            params.active
        );
    }

    function deleteSubscription(
        Params.DeleteSubscription memory params
    ) external override whenNotPaused {
        require(
            _merchants[msg.sender].wallet != address(0),
            Errors.MERCHANT_NOT_FOUND
        );

        require(
            _subscriptions[params.subscriptionId].merchant == msg.sender,
            Errors.UNAUTHORIZED
        );

        delete _subscriptions[params.subscriptionId];

        emit SubsciptionDeleted(params.subscriptionId);
    }

    function getWallet(
        address merchant
    ) public view override returns (address) {
        return _merchants[merchant].wallet;
    }

    function getMerchant(
        address merchant
    ) public view override returns (Types.MerchantConfig memory) {
        return _merchants[merchant];
    }

    function getSubscription(
        bytes32 subscriptionId
    ) public view override returns (Types.Subscription memory) {
        return _subscriptions[subscriptionId];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
