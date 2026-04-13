// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IBeam} from "../interfaces/IBeam.sol";
import {Params} from "../libs/Params.sol";

contract MockBeam is IBeam {
    address public lastCaller;
    uint256 public lastValue;
    bytes4 public lastSelector;

    function oneTimeTransaction(
        Params.CreateOneTimeTransaction memory
    ) external payable override {
        lastCaller = msg.sender;
        lastValue = msg.value;
        lastSelector = this.oneTimeTransaction.selector;
    }

    function fulfillOneTimeTransaction(
        Params.FulfillOneTimeTransaction memory
    ) external payable override {
        lastCaller = msg.sender;
        lastValue = msg.value;
        lastSelector = this.fulfillOneTimeTransaction.selector;
    }

    function recurrentTransaction(
        Params.CreateRecurrentTransaction memory
    ) external payable override {
        lastCaller = msg.sender;
        lastValue = msg.value;
        lastSelector = this.recurrentTransaction.selector;
    }

    function fulfillRecurrentTransaction(
        Params.FulfillRecurrentTransaction memory
    ) external payable override {
        lastCaller = msg.sender;
        lastValue = msg.value;
        lastSelector = this.fulfillRecurrentTransaction.selector;
    }

    function cancelRecurrentTransaction(
        Params.CancelRecurrentTransaction memory
    ) external override {
        lastCaller = msg.sender;
        lastValue = 0;
        lastSelector = this.cancelRecurrentTransaction.selector;
    }
}

