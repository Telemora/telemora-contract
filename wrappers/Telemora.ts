import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';

export type TelemoraConfig = {
  adminAddress: Address;
  commissionBps: number;
};

export function telemoraConfigToCell(config: TelemoraConfig): Cell {
  return beginCell().storeAddress(config.adminAddress).storeUint(config.commissionBps, 9).endCell();
}

export const Opcodes = {
  withdraw_admin: 0xf7a40b5b,
  make_payment: 0x7d9dcb09,
};

export class Telemora implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Telemora(address);
  }

  static createFromConfig(config: TelemoraConfig, code: Cell, workchain = 0) {
    const data = telemoraConfigToCell(config);
    const init = { code, data };
    return new Telemora(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendWithdrawAdmin(
    provider: ContractProvider,
    via: Sender,
    adminAddress: Address,
    amount: bigint,
    value: bigint = toNano('0.05'),
  ) {
    const messageBody = beginCell()
      .storeUint(Opcodes.withdraw_admin, 32)
      .storeUint(0, 64)
      .storeAddress(adminAddress)
      .storeCoins(amount)
      .endCell();

    await provider.internal(via, {
      value: value,
      bounce: true,
      body: messageBody,
    });
  }

  async sendMakePayment(provider: ContractProvider, via: Sender, sellerAddress: Address, value: bigint) {
    const messageBody = beginCell()
      .storeUint(Opcodes.make_payment, 32)
      .storeUint(0, 64)
      .storeAddress(sellerAddress)
      .endCell();

    await provider.internal(via, {
      value: value,
      bounce: true,
      body: messageBody,
    });
  }

  async getAdminAddress(provider: ContractProvider) {
    const result = await provider.get('get_admin_address', []);
    const adminAddress = result.stack.readAddressOpt();
    if (adminAddress) {
      return adminAddress.toString();
    }
    return null;
  }

  async getCommissionPercent(provider: ContractProvider) {
    const result = await provider.get('get_commission_percent', []);
    return result.stack.readNumber();
  }
}
