import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano
} from '@ton/core';

export type TelemoraConfig = {
  adminAddress: Address;
  commissionBps: number;
};

export function telemoraConfigToCell(config: TelemoraConfig): Cell {
  return beginCell().storeAddress(config.adminAddress).storeInt(config.commissionBps, 11).endCell();
}

export const Opcodes = {
  admin_withdraw: 0x4cdd6f51,
  change_percent: 0xfc121559,
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

  async getBalance(provider: ContractProvider) {
    const result = await provider.getState();
    return result.balance;
  }

  static withdrawMessage(amount: bigint, queryId: bigint | number = 0) {
    return beginCell()
      .storeUint(Opcodes.admin_withdraw, 32)
      .storeUint(queryId, 64)
      .storeCoins(amount)
      .endCell();
  }

  async sendWithdraw(provider: ContractProvider, via: Sender, amount: bigint, value:bigint = toNano('0.1'), queryId: bigint | number = 0){
    await provider.internal(via, {
      body: Telemora.withdrawMessage(amount, queryId),
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY
    });
  }

  static changePercentMessage(percent: number, queryId: bigint | number = 0) {
    return beginCell()
      .storeUint(Opcodes.change_percent, 32)
      .storeUint(queryId, 64)
      .storeUint(percent, 11)
      .endCell();
  }

  async sendChangePercent(provider: ContractProvider, via: Sender, percent: number, value:bigint = toNano('0.1'), queryId: bigint | number = 0){
    await provider.internal(via, {
      body: Telemora.changePercentMessage(percent, queryId),
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY
    });
  }

  async sendPaymentOrder(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      sellerAddress: Address;
      queryID?: number;
    },
  ) {
    const body = beginCell().storeUint(0, 32).storeAddress(opts.sellerAddress).endCell();

    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: body,
    });
  }

  async getAdminAddress(provider: ContractProvider) {
    const result = await provider.get('get_admin_address', []);
    const adminAddress = result.stack.readAddressOpt();
    return adminAddress?.toString() || null;
  }

  async getCommissionPercent(provider: ContractProvider) {
    const result = await provider.get('get_commission_percent', []);
    return result.stack.readNumber();
  }
}
