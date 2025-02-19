import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Telemart Production', () => {
    let code: Cell;
    beforeAll(async () => {
        code = await compile('Telemart');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let telemart: SandboxContract<Telemart>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        const ownerAddress = blockchain.treasury('deployer').address;
        telemart = blockchain.openContract(
            Telemart.createFromConfig({ owner: ownerAddress }, code)
        );
        deployer = await blockchain.treasury('deployer');
        const deployResult = await telemart.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: telemart.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy and process a purchase', async () => {
        const OP_PURCHASE = 0x01;
        const sellerAddressCell = beginCell().storeAddress(deployer.address).endCell();
        const body = beginCell()
            .storeUint(OP_PURCHASE, 32)
            .storeRef(sellerAddressCell)
            .endCell();
        const value = toNano('50');
        const res = await telemart.sendInternal(deployer.getSender(), {
            value,
            body,
        });
        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: telemart.address,
            success: true,
        });
    });
});
