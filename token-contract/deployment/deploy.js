const etherlime = require("etherlime-lib");
const ReMCToken = require("../build/ReMCToken.json");
const ethers = require("ethers");

const deploy = async (network, secret, etherscanApiKey) => {

	const name = "ReMeLifeCore";
	const symbol = "ReMC";
	const minter = "0x4555A429Df5Cc32efa46BCb1412a3CD7Bf14b381";

	const deployer = new etherlime.EtherlimeGanacheDeployer();
	const reMCTokenInstance = await deployer.deploy(ReMCToken, {}, name, symbol, minter);

};

module.exports = {
	deploy
};
