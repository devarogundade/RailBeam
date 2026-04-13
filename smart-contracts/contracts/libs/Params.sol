// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Types} from "./Types.sol";

library Params {
    struct CreateMerchant {
        Types.Metadata metadata;
        address[] tokens;
        address[] signers;
        uint256 minSigners;
    }

    struct UpdateMerchant {
        Types.Metadata metadata;
    }

    struct RegisterHook {
        address hook;
    }

    struct CreateOneTimeTransaction {
        address[] payers;
        address merchant;
        uint256[] amounts;
        address token;
        string description;
        Types.Metadata metadata;
    }

    struct FulfillOneTimeTransaction {
        bytes32 transactionId;
    }

    struct CreateSubscription {
        address token;
        uint256 interval;
        uint256 amount;
        uint256 gracePeriod;
        string description;
        Types.Metadata catalogMetadata;
    }

    struct UpdateSubscription {
        bytes32 subscriptionId;
        uint256 amount;
        uint256 gracePeriod;
        string description;
        Types.Metadata catalogMetadata;
        bool active;
    }

    struct DeleteSubscription {
        bytes32 subscriptionId;
    }

    struct CreateRecurrentTransaction {
        address merchant;
        bytes32 subscriptionId;
        string description;
        Types.Metadata metadata;
    }

    struct FulfillRecurrentTransaction {
        bytes32 transactionId;
    }

    struct CancelRecurrentTransaction {
        bytes32 transactionId;
    }

    struct RouteTransaction {
        address token;
        uint256 amount;
        address wallet;
    }

    struct MintReceipt {
        address to;
        bytes32 transactionId;
        string URI;
    }

    struct BeforePayment {
        address merchant;
        address payer;
        address token;
        uint256 amount;
    }

    struct AfterPayment {
        address merchant;
        bytes32 transactionId;
        address payer;
        address token;
        uint256 amount;
        address adjustedToken;
        uint256 adjustedAmount;
    }

    struct AdjustTokenAmount {
        address merchant;
        address payer;
        address token;
        uint256 amount;
    }
}
