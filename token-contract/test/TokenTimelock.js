const etherlime = require("etherlime-lib");
const ethers = require("ethers");
const Utils = require("./Utils");
const ReMCToken = require("../build/ReMCToken");
const TokenTimelock = require("../build/TokenTimelock");

describe("TokenTimelock", function () {
    this.timeout(10000);

    const alice = accounts[1].signer;
    const bob = accounts[2].signer;
    const carlos = accounts[3].signer;

    const aliceAmount = ethers.utils.parseEther("5");
    const bobAmount = ethers.utils.parseEther("6");
    const carlosAmount = ethers.utils.parseEther("7");

    const totalAmount = aliceAmount.add(bobAmount).add(carlosAmount);

	const adminRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN"));
	
    const owner = accounts[9];
    const minter = accounts[8];
    let reMCTokenInstance;

    const name = "ReMeLifeCore";
    const symbol = "ReMC";

    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer(owner.secretKey);
        reMCTokenInstance = await deployer.deploy(
            ReMCToken,
            {},
            name,
            symbol,
            minter.signer.address
        );
        tokenTimelockInstance = await deployer.deploy(
            TokenTimelock,
            {},
            reMCTokenInstance.contractAddress
        );

        await reMCTokenInstance
            .from(minter)
            .mint(tokenTimelockInstance.contractAddress, totalAmount);
    });

    it("should deploy token time lock contract", async () => {
        assert.isAddress(
            tokenTimelockInstance.contractAddress,
            "The contract was not deployed"
        );
        const tokenAddress = await tokenTimelockInstance.token();
        assert.equal(tokenAddress, reMCTokenInstance.contractAddress);
    });

    it("should validate admin role", async () => {
        const hasRole = await tokenTimelockInstance.hasRole(
            adminRole,
            deployer.signer.address
        );
        assert.ok(hasRole);
    });

    describe("Issue Deposit", function () {
        it("should issue a deposit", async () => {
            const days = 7;
            let timestampAfterNDays = await Utils.getTimestampForNdays(
                deployer.provider,
                days
            );
            await tokenTimelockInstance.issueDeposits(
                [alice.address, bob.address, carlos.address],
                [aliceAmount, bobAmount, carlosAmount],
                [timestampAfterNDays, timestampAfterNDays, timestampAfterNDays]
            );

            const aliceDeposit = await tokenTimelockInstance.getDeposit(
                alice.address
            );
            const bobDeposit = await tokenTimelockInstance.getDeposit(
                bob.address
            );
            const carlosDeposit = await tokenTimelockInstance.getDeposit(
                carlos.address
            );
            assert(aliceDeposit[0].amount.eq(aliceAmount));
            assert(bobDeposit[0].amount.eq(bobAmount));
            assert(carlosDeposit[0].amount.eq(carlosAmount));

            assert(aliceDeposit[0].releaseTime.eq(timestampAfterNDays));
            assert(bobDeposit[0].releaseTime.eq(timestampAfterNDays));
            assert(carlosDeposit[0].releaseTime.eq(timestampAfterNDays));
        });

        it("should emit DepositIssued event", async () => {
            const days = 7;
            let timestampAfterNDays = await Utils.getTimestampForNdays(
                deployer.provider,
                days
            );
            const expectedEvent = "DepositIssued";
            await assert.emit(
                tokenTimelockInstance.issueDeposits(
                    [alice.address],
                    [aliceAmount],
                    [timestampAfterNDays]
                ),
                expectedEvent
            );
        });

        it("should issue multiple deposits for one user", async () => {
            const days = 7;
            let timestampAfterNDays = await Utils.getTimestampForNdays(
                deployer.provider,
                days
            );
            await tokenTimelockInstance.issueDeposits(
                [alice.address, alice.address],
                [aliceAmount, aliceAmount.mul(2)],
                [timestampAfterNDays, timestampAfterNDays + 5]
            );

            const aliceDeposit = await tokenTimelockInstance.getDeposit(
                alice.address
            );

            assert(aliceDeposit[0].amount.eq(aliceAmount));
            assert(aliceDeposit[1].amount.eq(aliceAmount.mul(2)));

            assert(aliceDeposit[0].releaseTime.eq(timestampAfterNDays));
            assert(aliceDeposit[1].releaseTime.eq(timestampAfterNDays + 5));
        });

        it("should revert if addresses mismatch amounts", async () => {
            const days = 7;
            let timestampAfterNDays = await Utils.getTimestampForNdays(
                deployer.provider,
                days
            );
            await assert.revert(
                tokenTimelockInstance.issueDeposits(
                    [alice.address, bob.address],
                    [aliceAmount, bobAmount, carlosAmount],
                    [timestampAfterNDays, timestampAfterNDays]
                )
            );
        });

        it("should revert if addresses mismatch end dates", async () => {
            const days = 7;
            let timestampAfterNDays = await Utils.getTimestampForNdays(
                deployer.provider,
                days
            );
            await assert.revert(
                tokenTimelockInstance.issueDeposits(
                    [alice.address, bob.address],
                    [aliceAmount, bobAmount],
                    [timestampAfterNDays]
                )
            );
        });

        it("should revert if end dates mismatch amounts", async () => {
            const days = 7;
            let timestampAfterNDays = await Utils.getTimestampForNdays(
                deployer.provider,
                days
            );
            await assert.revert(
                tokenTimelockInstance.issueDeposits(
                    [alice.address, bob.address],
                    [aliceAmount, bobAmount],
                    [
                        timestampAfterNDays,
                        timestampAfterNDays,
                        timestampAfterNDays,
                    ]
                )
            );
        });

        it("should revert if not admin tries to set deposit", async () => {
            const days = 7;
            let timestampAfterNDays = await Utils.getTimestampForNdays(
                deployer.provider,
                days
            );
            await assert.revert(
                tokenTimelockInstance
                    .from(alice)
                    .issueDeposits(
                        [alice.address, bob.address],
                        [aliceAmount, bobAmount],
                        [timestampAfterNDays, timestampAfterNDays]
                    )
            );
        });

        it("should revert if end date is not in the future", async () => {
            let blockInfo = await deployer.provider.getBlock();
            await assert.revert(
                tokenTimelockInstance
                    .from(alice)
                    .issueDeposits(
                        [alice.address, bob.address],
                        [aliceAmount, bobAmount],
                        [blockInfo.timestamp, blockInfo.timestamp]
                    )
            );
        });
    });

    describe("Release Deposit", function () {
        let timestampAfterNDays;

        beforeEach(async () => {
            const days = 7;
            timestampAfterNDays = await Utils.getTimestampForNdays(
                deployer.provider,
                days
            );
            await tokenTimelockInstance.issueDeposits(
                [alice.address, bob.address, carlos.address],
                [aliceAmount, bobAmount, carlosAmount],
                [timestampAfterNDays, timestampAfterNDays, timestampAfterNDays]
            );
        });

        it("should release a deposit", async () => {
            let aliceBalance = await reMCTokenInstance.balanceOf(alice.address);
            assert(aliceBalance.eq(0));
            const index = 0;
            utils.timeTravel(deployer.provider, timestampAfterNDays);
            await tokenTimelockInstance.from(alice).releaseDeposit(index);

            const result = await tokenTimelockInstance.beneficiaries(
                alice.address,
                index
            );
            assert.ok(result.isClaimed);

            aliceBalance = await reMCTokenInstance.balanceOf(alice.address);
            assert(aliceBalance.eq(aliceAmount));
        });

        it("should emit DepositReleased event", async () => {
            const index = 0;
            utils.timeTravel(deployer.provider, timestampAfterNDays);

            const expectedEvent = "DepositReleased";
            await assert.emit(
                tokenTimelockInstance.from(alice).releaseDeposit(index),
                expectedEvent
            );
        });

        it("should revert if one tries to claim same deposit second time", async () => {
            const index = 0;
            utils.timeTravel(deployer.provider, timestampAfterNDays);
            await tokenTimelockInstance.from(alice).releaseDeposit(index);

            await assert.revert(
                tokenTimelockInstance.from(alice).releaseDeposit(index)
            );
        });

        it("should revert if one tries to claim before end date", async () => {
            const index = 0;
            await assert.revert(
                tokenTimelockInstance.from(alice).releaseDeposit(index)
            );
        });
    });
});
