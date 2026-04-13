// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IMultisigWallet {
    event TransactionReceived(
        address indexed merchant,
        address token,
        address payer,
        uint256 amount,
        bytes32 transactionId
    );

    event WithdrawRequestCreated(
        address indexed merchant,
        uint256 indexed requestId,
        address token,
        uint256 amount,
        address recipient,
        address[] signers,
        bool executed
    );

    event WithdrawRequestApproved(
        address indexed merchant,
        uint256 indexed requestId,
        address signer
    );

    event WithdrawRequestExecuted(
        address indexed merchant,
        uint256 indexed requestId
    );

    event SignersUpdated(
        address indexed merchant,
        address[] signers,
        uint256 minSigners
    );

    event TokensUpdated(address indexed merchant, address[] tokens);

    function updateTokens(address[] memory tokens) external;

    function updateSigners(
        address[] memory signers,
        uint256 minSigners
    ) external;

    function deposit(address token, uint256 amount) external payable;

    function approveWithdraw(uint256 requestId) external;

    function executeWithdraw(uint256 requestId) external;

    function isTokenAllowed(address token) external view returns (bool);
}
