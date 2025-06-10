import { Blockchain, printTransactionFees, SandboxContract, SendMessageResult, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
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
    printTransactionFees(deployResult.transactions)
  });

  it('should return the correct contract balance after deployment', async () => {
    const contractBalance = await telemora.getBalance();
    deployFee = deployResult.transactions[constants.SEC_TX_IDX].totalFees.coins;
    const expectedBalance = constants.INIT_BALANCE - deployFee;
    expect(contractBalance).toBe(expectedBalance);
  });

  /*it('should increase the contract balance by commission minus fee', async () => {
    const buyer = await blockchain.treasury('buyer');
    const seller = await blockchain.treasury('seller');
    const beforeBalance = await telemora.getBalance(); // is: 49667200n - we are sure about this
    const value = toNano('1'); // is 1_000_000_000n - we are sure about this

    const makePaymentRes = await telemora.sendPaymentOrder(buyer.getSender(), {
      value,
      sellerAddress: seller.address,
      queryID: 1,
    });
    printTransactionFees(makePaymentRes.transactions);
    const makePaymentFee = makePaymentRes.transactions[constants.SEC_TX_IDX].totalFees.coins; // is: 1294400n - we are sure about this
    const commission = value * (BigInt(constants.commissionBps) / BigInt(10000)); // is: 50000000n
    const expectedBalance = beforeBalance - makePaymentFee + commission; // is: 98372800n

    const afterBalance = await telemora.getBalance(); // is: 1048372800n
    expect(afterBalance).toBe(expectedBalance);
  });

  it('should decreases the contract balance', async () => {
    const admin = await blockchain.treasury('admin');
    const beforeBalance = await telemora.getBalance();

    const adminWithdrawRes = await telemora.sendAdminWithdraw(admin.getSender(), {
      senderAddress: admin.address,
      withdrawAmount: toNano('2'),
      queryID: 1,
    });
    printTransactionFees(adminWithdrawRes.transactions);

    const afterBalance = await telemora.getBalance();
    expect(afterBalance).toBeLessThan(beforeBalance);
  });

  it('should send withdraw request to Telemora Contract', async () => {
    const admin = await blockchain.treasury('admin');

    const sendResult = await telemora.sendAdminWithdraw(admin.getSender(), {
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

    const sendResult = await telemora.sendPaymentOrder(buyer.getSender(), {
      value: paymentValue,
      sellerAddress: seller.address,
      queryID: 1,
    });

    expect(sendResult.transactions).toHaveTransaction({
      from: buyer.address,
      to: telemora.address,
      value: paymentValue,
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
  });*/
});
