// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Types} from "../libs/Types.sol";
import {Params} from "../libs/Params.sol";
import {Errors} from "../libs/Errors.sol";
import {AddressLib} from "../libs/AddressLib.sol";

import {IHook} from "../interfaces/IHook.sol";
import {IHookManager} from "../interfaces/IHookManager.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract HookManager is Ownable, IHookManager {
    mapping(address => address) internal _hooks;
    mapping(address => Types.HookConfig) internal _hookConfigs;

    constructor() Ownable(msg.sender) {}

    function register(Params.RegisterHook memory params) external override {
        AddressLib.requireOne(params.hook);

        require(
            _hooks[msg.sender] == address(0),
            Errors.HOOK_ALREADY_REGISTERED
        );

        Types.HookConfig memory hookConfig = IHook(params.hook).onRegister();

        _hookConfigs[params.hook] = hookConfig;
        _hooks[msg.sender] = params.hook;

        emit HookRegistered(msg.sender, params.hook);
    }

    function unRegister() external override {
        address hook = getHook(msg.sender);

        AddressLib.requireOne(hook);

        IHook(hook).onUnRegister();

        delete _hookConfigs[hook];
        delete _hooks[msg.sender];

        emit HookUnRegistered(msg.sender, hook);
    }

    function beforePayment(
        Params.BeforePayment memory params
    ) external override onlyOwner {
        address hook = getHook(params.merchant);

        if (_hookConfigs[hook].onBeforePayment) {
            IHook(hook).onBeforePayment(
                params.payer,
                params.token,
                params.amount
            );
        }
    }

    function afterPayment(
        Params.AfterPayment memory params
    ) external override onlyOwner {
        address hook = getHook(params.merchant);

        if (_hookConfigs[hook].onAfterPayment) {
            IHook(hook).onAfterPayment(
                params.transactionId,
                params.payer,
                params.token,
                params.amount,
                params.adjustedToken,
                params.adjustedAmount
            );
        }
    }

    function adjustTokenAmount(
        Params.AdjustTokenAmount memory params
    )
        external
        view
        override
        returns (address adjustedToken, uint256 adjustedAmount)
    {
        address hook = getHook(params.merchant);

        if (_hookConfigs[hook].onAdjustTokenAmount) {
            return
                IHook(hook).onAdjustTokenAmount(
                    params.payer,
                    params.token,
                    params.amount
                );
        }

        return (params.token, params.amount);
    }

    function getHook(address merchant) public view override returns (address) {
        return _hooks[merchant];
    }
}
