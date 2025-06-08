import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
import { Opcodes, Telemora } from '../wrappers/Telemora';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Telemora', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Telemora');
  });

  let blockchain: Blockchain;
  let telemora: SandboxContract<Telemora>;
  let deployer: SandboxContract<TreasuryContract>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    deployer = await blockchain.treasury('deployer');

    telemora = blockchain.openContract(
      Telemora.createFromConfig(
        {
          adminAddress: deployer.address,
          commissionBps: 500,
        },
        code,
      ),
    );

    const deployResult = await telemora.sendDeploy(deployer.getSender(), toNano('1'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemora.address,
      deploy: true,
    });
  });

  it('should increases the contract balance', async () => {
    const buyer = await blockchain.treasury('buyer');
    const seller = await blockchain.treasury('seller');
    const beforeBalance = await telemora.getBalance();

    await telemora.sendPayment(buyer.getSender(), {
      value: toNano('1'),
      sellerAddress: seller.address,
      queryID: 1,
    });

    const afterBalance = await telemora.getBalance();
    expect(afterBalance).toBeGreaterThan(beforeBalance);
  });

  it('should decreases the contract balance', async () => {
    const admin = await blockchain.treasury('admin');
    const beforeBalance = await telemora.getBalance();

    await telemora.sendWithdraw(admin.getSender(), {
      value: toNano('0'),
      senderAddress: admin.address,
      withdrawAmount: toNano('2'),
      queryID: 1,
    });

    const afterBalance = await telemora.getBalance();
    expect(afterBalance).toBeLessThan(beforeBalance);
  });

  it('should send withdraw request to Telemora Contract', async () => {
    const admin = await blockchain.treasury('admin');

    const sendResult = await telemora.sendWithdraw(admin.getSender(), {
      value: toNano('0.05'),
      senderAddress: admin.address,
      withdrawAmount: toNano('2'),
      queryID: 1,
    });

    expect(sendResult.transactions).toHaveTransaction({
      from: admin.address,
      to: telemora.address,
      value: toNano('0.05'),
      op: Opcodes.admin_withdraw,
    });
  });

  it('should send a successful payment to Telemora Contract', async () => {
    const buyer = await blockchain.treasury('buyer');
    const seller = await blockchain.treasury('seller');
    const paymentValue = toNano('1');

    const sendResult = await telemora.sendPayment(buyer.getSender(), {
      value: paymentValue,
      sellerAddress: seller.address,
      queryID: 1,
    });

    expect(sendResult.transactions).toHaveTransaction({
      from: buyer.address,
      to: telemora.address,
      value: paymentValue,
      op: Opcodes.paymen,
    });
  });

  it('should return the correct commission percentage', async () => {
    const commission = await telemora.getCommissionPercent();
    expect(commission).toBe(500);
  });

  it('should return the correct admin address', async () => {
    const retrievedAdminAddress = await telemora.getAdminAddress();
    expect(retrievedAdminAddress).not.toBeNull();
    expect(Address.parse(retrievedAdminAddress!)).toEqualAddress(deployer.address);
  });
});
