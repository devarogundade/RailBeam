// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IAgentSubscription {
    event Subscribed(
        address indexed user,
        uint256 indexed agentId,
        uint256 numDays,
        uint256 amountPaid
    );
    event Unsubscribed(
        address indexed user,
        uint256 indexed agentId,
        uint256 daysLeft,
        uint256 refund
    );
    event FeesSet(uint256 indexed agentId, uint256 feePerDay);

    struct Subscription {
        uint256 endDate;
        uint256 paidAmount;
    }

    function subscribe(uint256 agentId, uint256 numDays) external payable;

    function unsubscribe(
        uint256 agentId
    ) external returns (uint256 daysLeft, uint256 refund);

    function setFees(uint256 agentId, uint256 feePerDay) external;

    function getFees(uint256 agentId) external view returns (uint256 feePerDay);
}
