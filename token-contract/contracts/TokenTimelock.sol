pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TokenTimelock is AccessControl {
    using SafeERC20 for IERC20;

    IERC20 public token;
    bytes32 public constant ADMIN = keccak256("ADMIN");

    mapping(address => Benefit[]) public beneficiaries;
    struct Benefit {
        uint256 amount;
        uint256 releaseTime;
        bool isClaimed;
    }

    event DepositIssued(
        address beneficiary,
        uint256 amount,
        uint256 releaseTime,
        uint256 index
    );

    event DepositReleased(address beneficiary, uint256 amount, uint256 index);

    constructor(IERC20 _token) public {
        token = _token;
        _setRoleAdmin(ADMIN, ADMIN);
        _setupRole(ADMIN, msg.sender);
    }

    function getDeposit(address _beneficiary)
        public
        view
        returns (Benefit[] memory)
    {
        return beneficiaries[_beneficiary];
    }

    function issueDeposits(
        address[] memory _beneficiaries,
        uint256[] memory _amounts,
        uint256[] memory _releaseTimes
    ) public {
        require(
            hasRole(ADMIN, _msgSender()),
            "AccessControl: msg.sender must has admin role to mint tokens"
        );

        require(
            _beneficiaries.length == _amounts.length,
            "Mismatch in the number of addresses and amounts"
        );

        require(
            _beneficiaries.length == _releaseTimes.length,
            "Mismatch in the number of addresses and release time"
        );

        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            require(
                _releaseTimes[i] > block.timestamp,
                "TokenTimelock: release time is before current time"
            );
            require(
                _beneficiaries[i] != address(0),
                "Beneficiary address cannot be zero address"
            );
            require(_amounts[i] > 0, "Amount cannot be 0");

            beneficiaries[_beneficiaries[i]].push(
                Benefit({
                    amount: _amounts[i],
                    releaseTime: _releaseTimes[i],
                    isClaimed: false
                })
            );
            emit DepositIssued(
                _beneficiaries[i],
                _amounts[i],
                _releaseTimes[i],
                beneficiaries[_beneficiaries[i]].length - 1
            );
        }
    }

    function releaseDeposit(uint256 _benefitId) public {
        require(
            block.timestamp >=
                beneficiaries[msg.sender][_benefitId].releaseTime,
            "TokenTimelock: current time is before release time"
        );
        require(
            !beneficiaries[msg.sender][_benefitId].isClaimed,
            "The deposit is already claimed"
        );

        beneficiaries[msg.sender][_benefitId].isClaimed = true;

        uint256 amount = beneficiaries[msg.sender][_benefitId].amount;
        token.safeTransfer(msg.sender, amount);

        emit DepositReleased(msg.sender, amount, _benefitId);
    }
}
