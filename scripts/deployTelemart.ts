import { toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Telemart } from '../wrappers/Telemart';

export async function run(provider: NetworkProvider) {
    const telemart = provider.open(
        Telemart.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('Telemart'),
        ),
    );
    await telemart.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(telemart.address);
    console.log('ID', await telemart.getID());
}
