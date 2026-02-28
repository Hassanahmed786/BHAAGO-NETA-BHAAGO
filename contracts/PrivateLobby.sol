// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PrivateLobby
 * @notice 1-vs-1 staking lobbies for Politician Surfers.
 *
 * Flow:
 *   1. Creator calls createLobby()  with msg.value = stake
 *   2. A unique 6-char alphanumeric code is returned
 *   3. Challenger calls joinLobby(code) with msg.value = same stake
 *   4. Both play; each calls submitScore(code, score)
 *   5. Contract auto-settles: higher score wins 97% of pot (3% fee)
 *   6. Winner calls claimWinnings() to receive MON
 *   7. Tie → prize split evenly
 *
 * Safety:
 *   - Creator can cancelLobby() if no challenger within 1 h
 *   - All state changes before external calls (checks-effects-interactions)
 */
contract PrivateLobby {
    // ─── Constants ────────────────────────────────────────────────────────────
    uint16 public constant FEE_BPS     = 300;    // 3 % platform fee
    uint256 public constant CANCEL_WAIT = 1 hours; // min wait before creator can cancel

    // ─── Storage ──────────────────────────────────────────────────────────────
    address public owner;

    struct Lobby {
        address  creator;
        address  challenger;
        uint256  stake;               // per player, in wei
        uint256  creatorScore;
        uint256  challengerScore;
        bool     creatorSubmitted;
        bool     challengerSubmitted;
        bool     settled;
        address  winner;              // address(0) = tie
        uint256  createdAt;
        bool     active;
    }

    mapping(bytes6 => Lobby) public lobbies;
    mapping(address => uint256) public pendingWithdrawals;

    // ─── Events ───────────────────────────────────────────────────────────────
    event LobbyCreated   (bytes6 indexed code, address indexed creator,    uint256 stake);
    event LobbyJoined    (bytes6 indexed code, address indexed challenger);
    event ScoreSubmitted (bytes6 indexed code, address indexed player,     uint256 score);
    event LobbySettled   (bytes6 indexed code, address indexed winner,     uint256 prize);
    event LobbyCancelled (bytes6 indexed code);
    event Withdrawn      (address indexed player, uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    constructor() { owner = msg.sender; }

    // ─── Lobby creation ───────────────────────────────────────────────────────

    /**
     * @dev Generate a deterministic 6-char code.
     *      Characters are A-Z and 2-9 (no 0/O/1/I confusion).
     */
    function _generateCode(address creator, uint256 salt) internal view returns (bytes6) {
        bytes memory charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars
        bytes32 h = keccak256(abi.encodePacked(creator, block.timestamp, block.prevrandao, salt));
        bytes memory code = new bytes(6);
        for (uint256 i = 0; i < 6; i++) {
            code[i] = charset[uint8(h[i]) % 32];
        }
        return bytes6(bytes(code));
    }

    /**
     * @notice Create a private lobby. msg.value is your stake.
     * @param  salt  Any uint — used to avoid code collisions (pass block.timestamp client-side)
     * @return code  6-character lobby code to share with your opponent
     */
    function createLobby(uint256 salt) external payable returns (bytes6 code) {
        require(msg.value > 0, "Stake must be > 0");

        code = _generateCode(msg.sender, salt);
        require(!lobbies[code].active, "Code collision - retry with different salt");

        lobbies[code] = Lobby({
            creator:             msg.sender,
            challenger:          address(0),
            stake:               msg.value,
            creatorScore:        0,
            challengerScore:     0,
            creatorSubmitted:    false,
            challengerSubmitted: false,
            settled:             false,
            winner:              address(0),
            createdAt:           block.timestamp,
            active:              true
        });

        emit LobbyCreated(code, msg.sender, msg.value);
    }

    /**
     * @notice Join an existing lobby. msg.value must equal the creator's stake.
     * @param  code  6-character lobby code
     */
    function joinLobby(bytes6 code) external payable {
        Lobby storage l = lobbies[code];
        require(l.active,                  "Lobby not found");
        require(l.challenger == address(0), "Lobby is already full");
        require(msg.sender   != l.creator,  "Cannot join your own lobby");
        require(msg.value    == l.stake,    "Wrong stake amount");

        l.challenger = msg.sender;
        emit LobbyJoined(code, msg.sender);
    }

    /**
     * @notice Submit your final score after the game ends.
     *         Call this once; both submissions auto-settle the lobby.
     * @param  code   6-character lobby code
     * @param  score  Your final score
     */
    function submitScore(bytes6 code, uint256 score) external {
        Lobby storage l = lobbies[code];
        require(l.active && !l.settled,              "Lobby not active");
        require(l.challenger != address(0),          "Waiting for challenger to join");
        require(
            msg.sender == l.creator || msg.sender == l.challenger,
            "You are not in this lobby"
        );

        if (msg.sender == l.creator) {
            require(!l.creatorSubmitted, "Score already submitted");
            l.creatorScore     = score;
            l.creatorSubmitted = true;
        } else {
            require(!l.challengerSubmitted, "Score already submitted");
            l.challengerScore     = score;
            l.challengerSubmitted = true;
        }

        emit ScoreSubmitted(code, msg.sender, score);

        // Auto-settle once both players have submitted
        if (l.creatorSubmitted && l.challengerSubmitted) {
            _settle(code);
        }
    }

    /**
     * @dev Internal settlement: determine winner, credit pending withdrawals.
     */
    function _settle(bytes6 code) internal {
        Lobby storage l = lobbies[code];
        l.settled = true;
        l.active  = false;

        uint256 totalPot = l.stake * 2;
        uint256 fee      = (totalPot * FEE_BPS) / 10000;
        uint256 prize    = totalPot - fee;

        pendingWithdrawals[owner] += fee;

        if (l.creatorScore > l.challengerScore) {
            l.winner = l.creator;
            pendingWithdrawals[l.creator] += prize;
        } else if (l.challengerScore > l.creatorScore) {
            l.winner = l.challenger;
            pendingWithdrawals[l.challenger] += prize;
        } else {
            // Tie: split evenly (any odd wei goes to fee pot)
            uint256 half = prize / 2;
            pendingWithdrawals[l.creator]    += half;
            pendingWithdrawals[l.challenger] += half;
            pendingWithdrawals[owner]        += prize - (half * 2);
        }

        emit LobbySettled(code, l.winner, prize);
    }

    /**
     * @notice Cancel an un-joined lobby and refund your stake.
     *         Only works if no challenger joined and CANCEL_WAIT has elapsed.
     */
    function cancelLobby(bytes6 code) external {
        Lobby storage l = lobbies[code];
        require(msg.sender      == l.creator,   "Not creator");
        require(l.active,                        "Not active");
        require(l.challenger    == address(0),   "Challenger already joined");
        require(block.timestamp >= l.createdAt + CANCEL_WAIT, "Wait 1 h before cancelling");

        l.active  = false;
        l.settled = true;
        pendingWithdrawals[msg.sender] += l.stake;

        emit LobbyCancelled(code);
    }

    /**
     * @notice Withdraw any winnings or refunds credited to your address.
     */
    function claimWinnings() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to claim");
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Full lobby state for a given code.
     */
    function getLobby(bytes6 code) external view returns (
        address creator,
        address challenger,
        uint256 stake,
        uint256 creatorScore,
        uint256 challengerScore,
        bool    creatorSubmitted,
        bool    challengerSubmitted,
        bool    settled,
        address winner,
        bool    active
    ) {
        Lobby memory l = lobbies[code];
        return (
            l.creator, l.challenger, l.stake,
            l.creatorScore, l.challengerScore,
            l.creatorSubmitted, l.challengerSubmitted,
            l.settled, l.winner, l.active
        );
    }

    /**
     * @notice How much MON is claimable by an address.
     */
    function pendingFor(address player) external view returns (uint256) {
        return pendingWithdrawals[player];
    }

    receive() external payable {}
}
