pragma solidity ^0.8.20;

contract RentalDepositEscrow {

    enum LeaseState {
        Created,
        DepositPaid,
        RefundRequested,
        Completed,
        Disputed
    }

    address public landlord;
    address public tenant;

    uint public depositAmount;
    uint public leaseEndDate;

    uint public requestedRefund;

    LeaseState public state;

    constructor(
        address _tenant,
        uint _depositAmount,
        uint _leaseDurationDays
    ) {
        landlord = msg.sender;
        tenant = _tenant;
        depositAmount = _depositAmount;
        leaseEndDate =
            block.timestamp +
            (_leaseDurationDays * 1 days);

        state = LeaseState.Created;
    }

    modifier onlyTenant() {
        require(msg.sender == tenant, "Only tenant allowed");
        _;
    }

    modifier onlyLandlord() {
        require(msg.sender == landlord, "Only landlord allowed");
        _;
    }

    modifier inState(LeaseState _state) {
        require(state == _state, "Invalid state");
        _;
    }

    function payDeposit()
        external
        payable
        onlyTenant
        inState(LeaseState.Created)
    {
        require(
            msg.value == depositAmount,
            "Incorrect deposit amount"
        );

        state = LeaseState.DepositPaid;
    }

    function requestRefund(
        uint refundAmount
    )
        external
        onlyLandlord
        inState(LeaseState.DepositPaid)
    {
        require(
            block.timestamp >= leaseEndDate,
            "Lease still active"
        );

        require(
            refundAmount <= depositAmount,
            "Invalid amount"
        );

        requestedRefund = refundAmount;
        state = LeaseState.RefundRequested;
    }

    function approveRefund()
        external
        onlyTenant
        inState(LeaseState.RefundRequested)
    {
        payable(tenant).transfer(
            requestedRefund
        );

        payable(landlord).transfer(
            address(this).balance
        );

        state = LeaseState.Completed;
    }

    function raiseDispute()
        external
        inState(LeaseState.RefundRequested)
    {
        require(
            msg.sender == tenant ||
            msg.sender == landlord,
            "Unauthorized"
        );

        state = LeaseState.Disputed;
    }

    function getBalance()
        public
        view
        returns (uint)
    {
        return address(this).balance;
    }
}