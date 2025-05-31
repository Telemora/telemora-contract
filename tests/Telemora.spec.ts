import { Blockchain, SandboxContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Telemora } from '../wrappers/Telemora';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Telemora', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Telemora');
  });

  let blockchain: Blockchain;
  let telemora: SandboxContract<Telemora>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    telemora = blockchain.openContract(
      Telemora.createFromConfig(
        {
          id: 0,
          telemora: 0,
        },
        code
      )
    );

    const deployer = await blockchain.treasury('deployer');

    const deployResult = await telemora.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemora.address,
      deploy: true,
    });
  });

  it('should deploy', async () => {
    // the check is done inside beforeEach
    // blockchain and telemora are ready to use
  });

  it('should increase telemora', async () => {
    const increaseTimes = 3;
    for (let i = 0; i < increaseTimes; i++) {
      console.log(`increase ${i + 1}/${increaseTimes}`);

      const increaser = await blockchain.treasury('increaser' + i);

      const telemoraBefore = await telemora.getTelemora();

      console.log('telemora before increasing', telemoraBefore);

      const increaseBy = Math.floor(Math.random() * 100);

      console.log('increasing by', increaseBy);

      const increaseResult = await telemora.sendIncrease(increaser.getSender(), {
        increaseBy,
        value: toNano('0.05'),
      });

      expect(increaseResult.transactions).toHaveTransaction({
        from: increaser.address,
        to: telemora.address,
        success: true,
      });

      const telemoraAfter = await telemora.getTelemora();

      console.log('telemora after increasing', telemoraAfter);

      expect(telemoraAfter).toBe(telemoraBefore + increaseBy);
    }
  });
});