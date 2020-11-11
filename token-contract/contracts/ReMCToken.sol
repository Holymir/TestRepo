pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ReMCToken is ERC20, AccessControl {
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MINTER = keccak256("MINTER");

    modifier onlyMinter() {
        require(
            hasRole(MINTER, _msgSender()),
            "AccessControl: msg.sender must has minter role to mint tokens"
        );
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address minter
    ) public ERC20(name, symbol) {
        _setRoleAdmin(ADMIN, ADMIN);
        _setRoleAdmin(MINTER, ADMIN);
        _setupRole(ADMIN, msg.sender);
        _setupRole(MINTER, minter);
    }

    function mint(address _to, uint256 _amount) public onlyMinter {
        _mint(_to, _amount);
    }

    function mintMultiple(address[] memory _to, uint256[] memory _amount)
        public
        onlyMinter
    {
        require(
            _to.length == _amount.length,
            "The count of the Recipients mismatch tche count ot the amounts"
        );
        for (uint256 i = 0; i < _to.length; i++) {
            _mint(_to[i], _amount[i]);
        }
    }
}
