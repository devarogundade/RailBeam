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

    /// @notice `msg.value` must equal `getFees(agentId) * numDays` (no overpay). Native fees are sent to the agent wallet.
    function subscribe(uint256 agentId, uint256 numDays) external payable;

    /// @notice Ends the subscription window early. Refund is always zero (fees were paid out on subscribe).
    function unsubscribe(
        uint256 agentId
    ) external returns (uint256 daysLeft, uint256 refund);

    /// @dev Refund is always zero; `daysLeft` reflects remaining time in the window.
    function viewUnsubscribe(address user, uint256 agentId) external view returns (uint256 daysLeft, uint256 refund);

    function setFees(uint256 agentId, uint256 feePerDay) external;

    function getFees(uint256 agentId) external view returns (uint256 feePerDay);
}
