async function getTimestampForNdays(provider, nDays) {
    const blockInfo = await provider.getBlock();

    const oneMinute = 60;
    const oneHour = 60 * oneMinute;
    const day = 24 * oneHour;
    return blockInfo.timestamp + day * nDays;
}

module.exports = {
    getTimestampForNdays: getTimestampForNdays,
};
