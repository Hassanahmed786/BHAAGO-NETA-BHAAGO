// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PoliticianNFT
 * @notice ERC-721 NFT for each politician character
 * @dev Mint to unlock characters. One per wallet per character. SVG on-chain.
 */

// Minimal ERC721 implementation (no OpenZeppelin dependency needed)
abstract contract ERC721 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    string public name;
    string public symbol;

    mapping(uint256 => address) internal _ownerOf;
    mapping(address => uint256) internal _balanceOf;
    mapping(uint256 => address) internal _approvals;
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    constructor(string memory _name, string memory _symbol) {
        name   = _name;
        symbol = _symbol;
    }

    function ownerOf(uint256 id) public view returns (address owner) {
        owner = _ownerOf[id];
        require(owner != address(0), "Token does not exist");
    }

    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "Zero address");
        return _balanceOf[owner];
    }

    function approve(address spender, uint256 id) public {
        address owner = _ownerOf[id];
        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "Not authorized");
        _approvals[id] = spender;
        emit Approval(owner, spender, id);
    }

    function getApproved(uint256 id) public view returns (address) {
        require(_ownerOf[id] != address(0), "Token does not exist");
        return _approvals[id];
    }

    function setApprovalForAll(address operator, bool approved) public {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 id) public {
        require(from == _ownerOf[id], "Wrong from");
        require(to != address(0), "Transfer to zero address");
        require(
            msg.sender == from ||
            isApprovedForAll[from][msg.sender] ||
            msg.sender == _approvals[id],
            "Not authorized"
        );
        _balanceOf[from]--;
        _balanceOf[to]++;
        _ownerOf[id]   = to;
        delete _approvals[id];
        emit Transfer(from, to, id);
    }

    function _mint(address to, uint256 id) internal {
        require(to != address(0), "Mint to zero address");
        require(_ownerOf[id] == address(0), "Token already exists");
        _balanceOf[to]++;
        _ownerOf[id] = to;
        emit Transfer(address(0), to, id);
    }

    function supportsInterface(bytes4 interfaceId) public pure virtual returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f || // ERC721Metadata
            interfaceId == 0x01ffc9a7;   // ERC165
    }
}

// ─── Base64 library (inline) ────────────────────────────────────────────────
library Base64 {
    string internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        string memory table = TABLE;
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);
        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            for { let i := 0 } lt(i, mload(data)) { } {
                i := add(i, 3)
                let input := and(mload(add(data, i)), 0xffffff)
                let out := mload(add(tablePtr, and(shr(18, input), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(12, input), 0x3F))), 255))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(6, input), 0x3F))), 255))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(input, 0x3F))), 255))
                out := shl(224, out)
                mstore(resultPtr, out)
                resultPtr := add(resultPtr, 4)
            }
            switch mod(mload(data), 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }
            mstore(result, encodedLen)
        }
        return result;
    }
}

// ─── String utilities ────────────────────────────────────────────────────────
library Strings {
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

// ─── Main NFT Contract ───────────────────────────────────────────────────────
contract PoliticianNFT is ERC721 {
    using Strings for uint256;

    // ─── Events ──────────────────────────────────────────────────────────────
    event CharacterMinted(address indexed player, uint8 characterId, uint256 tokenId, uint256 timestamp);

    // ─── Storage ─────────────────────────────────────────────────────────────
    address public owner;
    uint256 public nextTokenId;

    // player => characterId => tokenId (0 means not minted)
    mapping(address => mapping(uint8 => uint256)) public playerCharacterToken;
    // tokenId => characterId
    mapping(uint256 => uint8) public tokenCharacter;

    uint8 public constant MAX_CHARACTER_ID = 5;

    string[6] private CHARACTER_NAMES = [
        "Modi Runner",
        "Trump Runner",
        "Rahul Runner",
        "Kejriwal Runner",
        "Biden Runner",
        "Putin Runner"
    ];

    string[6] private CHARACTER_POWERS = [
        "Vikas Shield",
        "The Wall",
        "Bharat Jodo",
        "AAP Scan",
        "Aviator Boost",
        "KGB Ghost"
    ];

    // SVG fill colours per character (body colour)
    string[6] private CHARACTER_COLORS = [
        "#ff6600", // Modi — saffron kurta
        "#ff4400", // Trump — orange tint
        "#ffffff", // Rahul — white
        "#aaaaaa", // Kejriwal — grey muffler
        "#000080", // Biden — navy suit
        "#000000"  // Putin — black suit
    ];

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor() ERC721("Politician Surfers", "POLS") {
        owner = msg.sender;
        nextTokenId = 1;
    }

    // ─── Mint ─────────────────────────────────────────────────────────────────

    /**
     * @notice Mint a politician character NFT. One per wallet per character.
     * @param characterId  0–5
     */
    function mintCharacter(uint8 characterId) external returns (uint256 tokenId) {
        require(characterId <= MAX_CHARACTER_ID, "Invalid character");
        require(
            playerCharacterToken[msg.sender][characterId] == 0,
            "Already minted this character"
        );

        tokenId = nextTokenId++;
        _mint(msg.sender, tokenId);

        playerCharacterToken[msg.sender][characterId] = tokenId;
        tokenCharacter[tokenId] = characterId;

        emit CharacterMinted(msg.sender, characterId, tokenId, block.timestamp);
    }

    /**
     * @notice Check if a player owns a specific character NFT
     */
    function ownsCharacter(address player, uint8 characterId) external view returns (bool) {
        uint256 tid = playerCharacterToken[player][characterId];
        if (tid == 0) return false;
        return _ownerOf[tid] == player;
    }

    /**
     * @notice Get all character NFTs owned by a player
     */
    function getOwnedCharacters(address player) external view returns (uint8[] memory) {
        uint8[] memory temp = new uint8[](6);
        uint8 count = 0;
        for (uint8 i = 0; i <= MAX_CHARACTER_ID; i++) {
            uint256 tid = playerCharacterToken[player][i];
            if (tid != 0 && _ownerOf[tid] == player) {
                temp[count++] = i;
            }
        }
        uint8[] memory result = new uint8[](count);
        for (uint8 j = 0; j < count; j++) {
            result[j] = temp[j];
        }
        return result;
    }

    // ─── Token URI — fully on-chain SVG ──────────────────────────────────────

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_ownerOf[tokenId] != address(0), "Token does not exist");
        uint8 cId   = tokenCharacter[tokenId];
        string memory svg = _buildSVG(cId);
        string memory json = string(abi.encodePacked(
            '{"name":"', CHARACTER_NAMES[cId], ' #', tokenId.toString(), '",',
            '"description":"Politician Surfers character NFT - Built on Monad Testnet",',
            '"attributes":[',
                '{"trait_type":"Character","value":"', CHARACTER_NAMES[cId], '"},',
                '{"trait_type":"Special Power","value":"', CHARACTER_POWERS[cId], '"},',
                '{"trait_type":"Character ID","value":', uint256(cId).toString(), '}',
            '],',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    function _buildSVG(uint8 cId) internal view returns (string memory) {
        string memory color = CHARACTER_COLORS[cId];
        string memory name  = CHARACTER_NAMES[cId];
        string memory power = CHARACTER_POWERS[cId];
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" style="background:#0e0b1e">',
            '<rect x="150" y="100" width="100" height="120" rx="8" fill="', color, '"/>',
            '<circle cx="200" cy="80" r="35" fill="#f5c5a3"/>',
            '<rect x="180" y="220" width="16" height="60" fill="', color, '"/>',
            '<rect x="204" y="220" width="16" height="60" fill="', color, '"/>',
            '<rect x="108" y="110" width="40" height="16" fill="', color, '" rx="8"/>',
            '<rect x="252" y="110" width="40" height="16" fill="', color, '" rx="8"/>',
            '<text x="200" y="320" text-anchor="middle" fill="#836EF9" font-family="monospace" font-size="14" font-weight="bold">', name, '</text>',
            '<text x="200" y="345" text-anchor="middle" fill="#39ff14" font-family="monospace" font-size="10">', power, '</text>',
            '<text x="200" y="375" text-anchor="middle" fill="#c4b5fd" font-family="monospace" font-size="8">POLITICIAN SURFERS | MONAD</text>',
            '</svg>'
        ));
    }

    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
