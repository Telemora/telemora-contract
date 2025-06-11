import { Blockchain, printTransactionFees, SandboxContract, SendMessageResult, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
import { Telemora } from '../wrappers/Telemora';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { constants } from '../constants';

describe('Telemora', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Telemora');
  });

  let blockchain: Blockchain;
  let telemora: SandboxContract<Telemora>;
  let deployer: SandboxContract<TreasuryContract>;
  let deployResult: SendMessageResult;
  let deployFee: bigint;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    deployer = await blockchain.treasury('deployer');

    telemora = blockchain.openContract(
      Telemora.createFromConfig(
        {
          adminAddress: deployer.address,
          commissionBps: constants.commissionBps,
        },
        code,
      ),
    );

    deployResult = await telemora.sendDeploy(deployer.getSender(), constants.INIT_BALANCE);

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemora.address,
      deploy: true,
    });
  });

  it('should return the correct contract balance after deployment', async () => {
    const contractBalance = await telemora.getBalance();
    deployFee = deployResult.transactions[constants.SEC_TX_IDX].totalFees.coins;
    const expectedBalance = constants.INIT_BALANCE - deployFee;
    expect(contractBalance).toBe(expectedBalance);
  });

  it('should increase the contract balance', async () => {
    const buyer = await blockchain.treasury('buyer');
    const seller = await blockchain.treasury('seller');
    const beforeBalance = await telemora.getBalance();
    const value = toNano('3');

    await telemora.sendPaymentOrder(buyer.getSender(), {
      value,
      sellerAddress: seller.address,
      queryID: 1
    });

    const afterBalance = await telemora.getBalance();
    expect(afterBalance).toBeGreaterThan(beforeBalance);
  });

  it('should decreases the contract balance', async () => {
    const beforeBalance = await telemora.getBalance();

    await telemora.sendWithdraw(deployer.getSender(), toNano('1'));

    const afterBalance = await telemora.getBalance();
    expect(afterBalance).toBeLessThan(beforeBalance);
  });

  it('should change the commission percentage to 300', async () => {
    const newCommissionPercent = 300;

    await telemora.sendChangePercent(deployer.getSender(), newCommissionPercent);

    const updatedCommission = await telemora.getCommissionPercent();
    expect(updatedCommission).toBe(newCommissionPercent);
  })

  it('should return the correct admin address', async () => {
    const retrievedAdminAddress = await telemora.getAdminAddress();
    expect(retrievedAdminAddress).not.toBeNull();
    expect(Address.parse(retrievedAdminAddress!)).toEqualAddress(deployer.address);
  });
});
