// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Leaderboard
 * @notice On-chain leaderboard for Politician Surfers
 * @dev Maintains sorted top-100 leaderboard on-chain
 */
contract Leaderboard {
    // ─── Events ────────────────────────────────────────────────────────────────
    event ScoreUpdated(address indexed player, string displayName, uint256 score, uint256 rank, uint256 timestamp);
    event NewTopPlayer(address indexed player, string displayName, uint256 score, uint256 timestamp);

    // ─── Structs ────────────────────────────────────────────────────────────────
    struct LeaderboardEntry {
        address player;
        string  displayName;
        uint256 highScore;
        uint256 lastUpdated;
        bool    exists;
    }

    // ─── Storage ────────────────────────────────────────────────────────────────
    mapping(address => LeaderboardEntry) public playerEntries;
    mapping(address => uint256)          public playerIndex; // 1-indexed position in entries array
    address[]                            public entries;     // ordered by insertion; sorted on update

    uint256 public constant MAX_ENTRIES = 100;
    address public owner;

    // ─── Constructor ────────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ─── Core functions ──────────────────────────────────────────────────────────

    /**
     * @notice Update score for a player. Only improves if new score is higher.
     * @param player       Player wallet address (must equal msg.sender)
     * @param displayName  Player's chosen display name (max 20 chars)
     * @param score        Score to record
     */
    function updateScore(address player, string calldata displayName, uint256 score) external {
        require(player == msg.sender, "Can only update for yourself");
        require(bytes(displayName).length > 0 && bytes(displayName).length <= 20, "Name must be 1-20 chars");
        require(score > 0, "Score must be positive");

        LeaderboardEntry storage entry = playerEntries[player];

        if (!entry.exists) {
            // New player
            entry.player      = player;
            entry.displayName = displayName;
            entry.highScore   = score;
            entry.lastUpdated = block.timestamp;
            entry.exists      = true;

            if (entries.length < MAX_ENTRIES) {
                entries.push(player);
                playerIndex[player] = entries.length; // 1-indexed
            } else {
                // Check if this score beats the lowest on the board
                address lowestPlayer = _findLowestScorePlayer();
                if (score > playerEntries[lowestPlayer].highScore) {
                    uint256 idx = playerIndex[lowestPlayer] - 1;
                    entries[idx] = player;
                    playerIndex[player] = idx + 1;
                    delete playerIndex[lowestPlayer];
                    delete playerEntries[lowestPlayer];
                }
            }

            emit NewTopPlayer(player, displayName, score, block.timestamp);
        } else {
            // Existing player — only update if higher
            if (score > entry.highScore) {
                entry.highScore   = score;
                entry.lastUpdated = block.timestamp;
            }
            // Always update display name
            entry.displayName = displayName;
        }

        uint256 rank = getPlayerRank(player);
        emit ScoreUpdated(player, displayName, playerEntries[player].highScore, rank, block.timestamp);
    }

    /**
     * @notice Get top N players sorted by score (descending)
     * @param count  How many entries to return (max 100)
     */
    function getTopPlayers(uint8 count)
        external
        view
        returns (
            address[]  memory addrs,
            string[]   memory names,
            uint256[]  memory scores,
            uint256[]  memory timestamps
        )
    {
        uint256 total = entries.length;
        uint256 returnCount = count > total ? total : count;
        if (returnCount > MAX_ENTRIES) returnCount = MAX_ENTRIES;

        // Build temporary sorted snapshot (bubble sort — small N OK for view)
        address[] memory sorted = new address[](total);
        for (uint256 i = 0; i < total; i++) {
            sorted[i] = entries[i];
        }
        // Bubble sort descending by highScore
        for (uint256 i = 0; i < total; i++) {
            for (uint256 j = i + 1; j < total; j++) {
                if (playerEntries[sorted[j]].highScore > playerEntries[sorted[i]].highScore) {
                    address tmp = sorted[i];
                    sorted[i]   = sorted[j];
                    sorted[j]   = tmp;
                }
            }
        }

        addrs      = new address[](returnCount);
        names      = new string[](returnCount);
        scores     = new uint256[](returnCount);
        timestamps = new uint256[](returnCount);

        for (uint256 i = 0; i < returnCount; i++) {
            LeaderboardEntry storage e = playerEntries[sorted[i]];
            addrs[i]      = e.player;
            names[i]      = e.displayName;
            scores[i]     = e.highScore;
            timestamps[i] = e.lastUpdated;
        }
    }

    /**
     * @notice Get player's current rank (1 = best)
     */
    function getPlayerRank(address player) public view returns (uint256 rank) {
        if (!playerEntries[player].exists) return 0;
        uint256 playerScore = playerEntries[player].highScore;
        rank = 1;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i] != player && playerEntries[entries[i]].highScore > playerScore) {
                rank++;
            }
        }
    }

    /**
     * @notice Get a player's entry
     */
    function getPlayerEntry(address player)
        external
        view
        returns (
            string  memory displayName,
            uint256 highScore,
            uint256 rank,
            uint256 lastUpdated
        )
    {
        LeaderboardEntry storage e = playerEntries[player];
        return (
            e.displayName,
            e.highScore,
            getPlayerRank(player),
            e.lastUpdated
        );
    }

    /**
     * @notice Total number of players on leaderboard
     */
    function totalPlayers() external view returns (uint256) {
        return entries.length;
    }

    // ─── Internal ───────────────────────────────────────────────────────────────

    function _findLowestScorePlayer() internal view returns (address lowestPlayer) {
        uint256 lowestScore = type(uint256).max;
        for (uint256 i = 0; i < entries.length; i++) {
            uint256 s = playerEntries[entries[i]].highScore;
            if (s < lowestScore) {
                lowestScore  = s;
                lowestPlayer = entries[i];
            }
        }
    }
}
