const etherlime = require("etherlime-lib");
const ReMCToken = require("../build/ReMCToken");
const ethers = require("ethers");

describe("ReMCToken", function () {
    let alice = accounts[1].signer;
    let owner = accounts[9];
    let minter = accounts[8];
    let reMCTokenInstance;

    const name = "ReMeLifeCore";
    const symbol = "ReMC";

    const adminRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN"));
    const minterRole = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("MINTER")
    );

    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer(owner.secretKey);
        reMCTokenInstance = await deployer.deploy(
            ReMCToken,
            {},
            name,
            symbol,
            minter.signer.address
        );
    });

    it("should deploy token contract", async () => {
        assert.isAddress(
            reMCTokenInstance.contractAddress,
            "The contract was not deployed"
        );
    });

    it("should validate admin role", async () => {
        const hasRole = await reMCTokenInstance.hasRole(
            adminRole,
            deployer.signer.address
        );
        assert.ok(hasRole);
    });

    it("should validate minter role", async () => {
        const hasRole = await reMCTokenInstance.hasRole(
            minterRole,
            minter.signer.address
        );
        assert.ok(hasRole);
    });

    it("should grant minter role by admin", async () => {
        const newMinter = accounts[2].signer.address;
        const hasRole = await reMCTokenInstance.hasRole(minterRole, newMinter);
        assert.ok(!hasRole);

        await reMCTokenInstance.grantRole(minterRole, newMinter);

        const hasRoleAfter = await reMCTokenInstance.hasRole(
            minterRole,
            newMinter
        );
        assert.ok(hasRoleAfter);
    });

    it("should grant admin role by admin", async () => {
        const newAdmin = accounts[2].signer.address;
        const hasRole = await reMCTokenInstance.hasRole(adminRole, newAdmin);
        assert.ok(!hasRole);

        await reMCTokenInstance.grantRole(adminRole, newAdmin);

        const hasRoleAfter = await reMCTokenInstance.hasRole(
            adminRole,
            newAdmin
        );
        assert.ok(hasRoleAfter);
    });

    it("should revert if other than admin tryes to grant role", async () => {
        const newMinter = accounts[2].signer.address;
        await assert.revert(
            reMCTokenInstance.from(minter).grantRole(minterRole, newMinter)
        );
    });

    it("should revoke minter", async () => {
        const hasRole = await reMCTokenInstance.hasRole(
            minterRole,
            minter.signer.address
        );
        assert.ok(hasRole);
        await reMCTokenInstance.revokeRole(minterRole, minter.signer.address);

        const hasRoleAfter = await reMCTokenInstance.hasRole(
            minterRole,
            minter.signer.address
        );
        assert.ok(!hasRoleAfter);
    });

    it("should revert if other than admin tryes to revoke minter", async () => {
        await assert.revert(
            reMCTokenInstance
                .from(minter)
                .revokeRole(minterRole, minter.signer.address)
        );
    });

    it("should mint tokens from minter", async () => {
        const amount = ethers.utils.parseEther("5");
        await reMCTokenInstance.from(minter).mint(alice.address, amount);
        const aliceBalance = await reMCTokenInstance.balanceOf(alice.address);
        assert(aliceBalance.eq(amount));
    });

    it("should Revert if not minter tries to mint", async () => {
        const amount = ethers.utils.parseEther("5");
        await assert.revert(
            reMCTokenInstance.from(owner).mint(alice.address, amount)
        );
    });
});
