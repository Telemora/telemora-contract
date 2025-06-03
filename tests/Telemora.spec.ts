import { Blockchain, SandboxContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
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
  const testAdminAddress = Address.parse('EQBGhqLAZseEqRXz4ByFPTGV7SVMlI4hrbs-Sps_Xzx01x8G');

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    const deployer = await blockchain.treasury('deployer');

    telemora = blockchain.openContract(
      Telemora.createFromConfig(
        {
          adminAddress: deployer.address,
          commissionBps: 500,
        },
        code,
      ),
    );

    const deployResult = await telemora.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemora.address,
      deploy: true,
    });
  });

  it('should return the correct admin address', async () => {
    const retrievedAdminAddress = await telemora.getAdminAddress();
    expect(retrievedAdminAddress).not.toBeNull();
    expect(Address.parse(retrievedAdminAddress!)).toEqualAddress(testAdminAddress);
  });

  it('should return the correct commission percentage', async () => {
    const commission = await telemora.getCommissionPercent();
    expect(commission).toBe(500);
  });
});
