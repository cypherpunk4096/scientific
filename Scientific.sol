// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SCIENTIFIC — the scifi concept mint (measure for accuracy → mint at scientific maximum).
 *
 * A self-contained ERC-20 (zero imports — airgap/offline-compileable) whose FIXED scientific
 * supply is the maximum representable value, 2^256-1, minted entirely to the bankon.eth OVERLORD
 * at construction. 18 decimals (cypherpunk2048 18-decimal accuracy, wei parity). No mint function:
 * the scientific maximum is reached at genesis — supply cannot grow.
 *
 *   decimals = 18 ; totalSupply = type(uint256).max = 2^256-1
 *
 * The contract is also the OVERLORD's treasury surface: it can RECEIVE funds (plain ETH lands via
 * receive(); any ERC-20 can be transferred to it) and the funds are SENT FROM the contract only by
 * the OVERLORD's hand (sendValue / sendToken) — token balances and supply are never touched by it.
 *
 * The scifi domain: the nGn oscilloscope (engine/ngn/oscilloscope.js) measures sound for accuracy at
 * 18 decimals and derives a uint256 voiceprint in this same domain. SCIENTIFIC is the OVERLORD's first
 * deploy (OVERLORD v1.10a). Privilege is BONA FIDE; this is the unit of scientific accounting.
 *
 * (c) 2026 BANKON / PYTHAI — MIT
 */
contract Scientific {
    string public constant name = "SCIEN";
    string public constant symbol = "TIFIC";
    uint8  public constant decimals = 18;

    // the scientific maximum — 2^256-1
    uint256 public constant TOTAL_SUPPLY = type(uint256).max;

    uint256 public totalSupply;
    address public overlord; // bankon.eth — owner of all tokens initially

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OverlordTransferred(address indexed from, address indexed to);
    event Received(address indexed from, uint256 value);
    event Sent(address indexed to, uint256 value);
    event TokenSent(address indexed token, address indexed to, uint256 value);

    constructor(address overlord_) {
        overlord = overlord_ == address(0) ? msg.sender : overlord_;
        totalSupply = TOTAL_SUPPLY;
        balanceOf[overlord] = TOTAL_SUPPLY; // minted entirely to the overlord — the scientific maximum
        emit Transfer(address(0), overlord, TOTAL_SUPPLY);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        return _transfer(msg.sender, to, value);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= value, "TIFIC:allowance");
        if (a != type(uint256).max) allowance[from][msg.sender] = a - value;
        return _transfer(from, to, value);
    }

    function _transfer(address from, address to, uint256 value) internal returns (bool) {
        require(to != address(0), "TIFIC:zero to");
        uint256 b = balanceOf[from];
        require(b >= value, "TIFIC:balance");
        // supply is conserved (= 2^256-1); no single balance can exceed the max → no overflow
        unchecked { balanceOf[from] = b - value; balanceOf[to] += value; }
        emit Transfer(from, to, value);
        return true;
    }

    /// Hand the overlord role to a new owner (e.g. devolution to DAIO). Balances unaffected.
    function transferOverlord(address to) external {
        require(msg.sender == overlord, "TIFIC:only overlord");
        emit OverlordTransferred(overlord, to);
        overlord = to;
    }

    /// The contract RECEIVES funds — plain ETH transfers land in the treasury.
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    /// Send ETH held by the contract. OVERLORD-gated — the treasury dispenses only by its hand.
    function sendValue(address payable to, uint256 value) external {
        require(msg.sender == overlord, "TIFIC:only overlord");
        require(to != address(0), "TIFIC:zero to");
        (bool ok, ) = to.call{value: value}("");
        require(ok, "TIFIC:send failed");
        emit Sent(to, value);
    }

    /// Send any ERC-20 held by the contract (including SCIEN·TIFIC itself). OVERLORD-gated.
    /// Raw-selector call keeps the zero-import stance; tolerates no-return tokens (USDT-shape).
    function sendToken(address token, address to, uint256 value) external {
        require(msg.sender == overlord, "TIFIC:only overlord");
        require(to != address(0), "TIFIC:zero to");
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(ok && (ret.length == 0 || abi.decode(ret, (bool))), "TIFIC:token send failed");
        emit TokenSent(token, to, value);
    }
}
