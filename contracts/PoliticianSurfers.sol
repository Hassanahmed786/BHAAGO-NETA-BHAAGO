// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PoliticianSurfers
 * @notice Main game contract for Politician Surfers on Monad Testnet
 * @dev Stores player stats, coin collection records, and game scores
 */
contract PoliticianSurfers {
    // ─── Events ────────────────────────────────────────────────────────────────
    event CoinCollected(address indexed player, uint256 amount, uint256 totalCoins, uint256 timestamp);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 totalCoins, uint256 gamesPlayed, uint256 timestamp);
    event CharacterSelected(address indexed player, uint8 characterId, uint256 timestamp);
    event PowerUsed(address indexed player, uint8 characterId, string powerName, uint256 timestamp);

    // ─── Structs ────────────────────────────────────────────────────────────────
    struct PlayerStats {
        uint256 totalCoins;
        uint256 highScore;
        uint8   characterId;
        uint256 gamesPlayed;
        uint256 lastPlayed;
        bool    exists;
    }

    struct GameSession {
        uint256 score;
        uint256 coinsCollected;
        uint8   characterId;
        uint256 timestamp;
    }

    // ─── Storage ────────────────────────────────────────────────────────────────
    mapping(address => PlayerStats)     public players;
    mapping(address => GameSession[])   public gameHistory;
    mapping(address => bool)            public characterUnlocked;

    address public owner;
    uint256 public totalPlayersEver;
    uint256 public totalCoinsEverCollected;
    uint256 public totalGamesPlayed;

    // Character IDs: 0=Modi, 1=Trump, 2=Rahul, 3=Kejriwal, 4=Biden, 5=Putin
    uint8 public constant MAX_CHARACTER_ID = 5;

    // ─── Modifiers ──────────────────────────────────────────────────────────────
    modifier validCharacter(uint8 cId) {
        require(cId <= MAX_CHARACTER_ID, "Invalid character ID");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ─── Internal helper ────────────────────────────────────────────────────────
    function _ensurePlayer(address player) internal {
        if (!players[player].exists) {
            players[player].exists = true;
            totalPlayersEver++;
        }
    }

    // ─── External functions ─────────────────────────────────────────────────────

    /**
     * @notice Select a character — stored on-chain permanently
     * @param player  Wallet address of the player (must be msg.sender in production,
     *                kept flexible here so the frontend can pass it directly)
     * @param characterId  0–5
     */
    function selectCharacter(address player, uint8 characterId)
        external
        validCharacter(characterId)
    {
        require(player == msg.sender, "Can only select for yourself");
        _ensurePlayer(player);
        players[player].characterId = characterId;
        emit CharacterSelected(player, characterId, block.timestamp);
    }

    /**
     * @notice Record coins collected during a session (called every 5 coins by the frontend)
     * @param player  Player address
     * @param amount  Number of coins collected in this batch
     */
    function recordCoinCollected(address player, uint256 amount) external {
        require(player == msg.sender, "Can only record for yourself");
        require(amount > 0 && amount <= 100, "Invalid coin amount");
        _ensurePlayer(player);
        players[player].totalCoins += amount;
        totalCoinsEverCollected += amount;
        emit CoinCollected(player, amount, players[player].totalCoins, block.timestamp);
    }

    /**
     * @notice Submit final score at game over
     * @param player      Player address
     * @param score       Final game score
     * @param totalCoins  Total coins collected in this session
     */
    function submitScore(address player, uint256 score, uint256 totalCoins) external {
        require(player == msg.sender, "Can only submit for yourself");
        _ensurePlayer(player);

        PlayerStats storage stats = players[player];

        // Update high score
        if (score > stats.highScore) {
            stats.highScore = score;
        }

        stats.gamesPlayed++;
        stats.lastPlayed = block.timestamp;

        totalGamesPlayed++;

        // Record session history (keep last 10)
        GameSession[] storage history = gameHistory[player];
        if (history.length >= 10) {
            // Shift array left
            for (uint256 i = 0; i < history.length - 1; i++) {
                history[i] = history[i + 1];
            }
            history.pop();
        }
        history.push(GameSession({
            score:          score,
            coinsCollected: totalCoins,
            characterId:    stats.characterId,
            timestamp:      block.timestamp
        }));

        emit ScoreSubmitted(player, score, totalCoins, stats.gamesPlayed, block.timestamp);
    }

    /**
     * @notice Record when a player uses their special power
     */
    function recordPowerUsed(address player, string calldata powerName) external {
        require(player == msg.sender, "Can only record for yourself");
        _ensurePlayer(player);
        emit PowerUsed(player, players[player].characterId, powerName, block.timestamp);
    }

    // ─── View functions ──────────────────────────────────────────────────────────

    /**
     * @notice Get full player statistics
     */
    function getPlayerStats(address player)
        external
        view
        returns (
            uint256 totalCoins,
            uint256 highScore,
            uint8   characterId,
            uint256 gamesPlayed,
            uint256 lastPlayed
        )
    {
        PlayerStats storage stats = players[player];
        return (
            stats.totalCoins,
            stats.highScore,
            stats.characterId,
            stats.gamesPlayed,
            stats.lastPlayed
        );
    }

    /**
     * @notice Get the last N game sessions for a player
     */
    function getGameHistory(address player)
        external
        view
        returns (GameSession[] memory)
    {
        return gameHistory[player];
    }

    /**
     * @notice Get global stats
     */
    function getGlobalStats()
        external
        view
        returns (
            uint256 _totalPlayers,
            uint256 _totalCoins,
            uint256 _totalGames
        )
    {
        return (totalPlayersEver, totalCoinsEverCollected, totalGamesPlayed);
    }
}
