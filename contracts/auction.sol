pragma solidity ^0.4.0;

import "./strings-util.sol";

contract NineFoldAuction {

    using strings for *;

    string[] collectibles;

    address creator;

    bool public paused = false;

    /*
        collectibles => (addresses that bid on them)
    */
    struct Bidder {
        address highestBidder;
        string username;
        uint amount;
        string img_url;
    }

    // collectible => Bidder struct
    mapping(string => Bidder) private bids;
    mapping(address => bool) private frozen;

    //sha256 hash of username => encrypted keystore file
    mapping(bytes32 => string) private userKeystore;

    modifier isCreator() { if (creator == msg.sender) _; }
    modifier whenNotPaused() { require(!paused); _; }

    // This generates a public event on the blockchain that will notify clients
    event Transfer(address indexed from, address indexed to, uint256 value);
    event NewOwner(address newOwner, string collectible);
    event CreatedNewCollectible(string collectible);

    function NineFoldAuction() public {
        creator = msg.sender;
    }

    function bid(string username, string collectible, string img_url) public payable whenNotPaused returns (bool gotCollectible) {
        require(isValidCollectible(collectible)); // has to be be on a valid collectible
        require(msg.value > bids[collectible].amount); // you have to bid higher than previous amount
        require(msg.sender != bids[collectible].highestBidder); // no need to buy it again
        require(isFrozen(msg.sender) == false); // Not a bad actor we froze

        /*
            We can't verify it's truly the username associated to an address but
            we can verify it's a real account *shrug*. Better than exposing
            everyone's usernames I guess

            So, yeah, if you want to impersonante someone, go for it. We still
            have your address as proof. :)
        */
        require(bytes(userKeystore[sha256(username)]).length > 0);

        // Give the collectible to someone
        Bidder storage b = bids[collectible];

        address prevOwner = b.highestBidder;

        bids[collectible] = Bidder({highestBidder: msg.sender, username: username, amount: msg.value, img_url: img_url});
        NewOwner(msg.sender, collectible);

        if (prevOwner != 0x0) {
            uint fee = msg.value / 33; // 3% tax

            _transfer(msg.sender, prevOwner, (msg.value - fee));
            _transfer(this, creator, fee);
        }

        return true;
    }

    function getOwner(string collectible) public view returns (string username, address owner, uint amount) {
        require(isValidCollectible(collectible));

        Bidder storage o = bids[collectible];

        return (o.username, o.highestBidder, o.amount);
    }

    function createNewCollectible(string collectible, uint amount, string img_url) public isCreator returns (bool itWasCreated) {
        // Don't re-create the same collectible
        require(isValidCollectible(collectible) == false);

        collectibles.push(collectible);
        bids[collectible].highestBidder = msg.sender;
        bids[collectible].amount = amount;
        bids[collectible].img_url = img_url;

        CreatedNewCollectible(collectible);

        return true;
    }

    function isValidCollectible(string collectible) public view returns (bool isValid) {
        require(collectible.toSlice().len() > 0);

        for (uint32 i = 0; i < collectibles.length; i++) {
            if (keccak256(collectibles[i]) == keccak256(collectible)) {
                return true;
            }
        }

        return false;
    }

    function getCollectibleById(uint id) public view returns (address owner, string collectible, uint amount, string img_url, string username) {
        require(id < collectibles.length && id >= 0);

        return (
            bids[collectibles[id]].highestBidder,
            collectibles[id],
            bids[collectibles[id]].amount,
            bids[collectibles[id]].img_url,
            bids[collectibles[id]].username
        );
    }

    function getNumberOfCollectibles() public view returns (uint) {
        return collectibles.length;
    }

    function freezeUser(address addr, bool freeze) public isCreator {
        require(msg.sender != addr); // Don't freeze yourself

        frozen[addr] = freeze;
    }

    function isFrozen(address addr)  public view returns (bool) {
        return frozen[addr];
    }

    function setPause(bool p) public isCreator returns (bool) {
        paused = p;
    }

    function storeKeyStore(string username, string keystore) public whenNotPaused returns (bool) {
        require(bytes(username).length > 0);
        require(bytes(keystore).length > 0);

        bytes32 hash = sha256(username);

        require(bytes(userKeystore[hash]).length == 0); // Shouldn't be used

        userKeystore[hash] = keystore;

        return true;
    }

    function getKeyStore(string username) public view returns (string) {
        require(bytes(username).length > 0);

        bytes32 hash = sha256(username);

        return userKeystore[hash];
    }

    function _transfer(address _from, address _to, uint _value) internal {
        require(_to != 0x0);

        Transfer(_from, _to, _value);

        _to.transfer(_value);
    }
}
