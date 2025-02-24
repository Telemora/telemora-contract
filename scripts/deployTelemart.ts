import { toNano } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // Compile the Telemart contract (contracts/market_place.fc)
    const marketPlace = provider.open(Telemart.createFromConfig({}, await compile('Telemart')));

    // Deploy the contract with an attached value (e.g., 0.05 TON)
    await marketPlace.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(marketPlace.address);

    // After deployment, you can call methods on `marketPlace`
}
