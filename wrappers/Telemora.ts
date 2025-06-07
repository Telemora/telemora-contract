import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  TupleBuilder
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
  payment: 0x1b40800,
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
    return Number(result.balance.toString());
  }

  /**
   * @description Wrapper method for sending an 'admin_withdraw' message to the FunC contract.
   * This method constructs and sends the internal message needed to invoke the 'admin_withdraw'
   * operation in your contract's `recv_internal` function.
   *
   * @param provider Interface to interact with the blockchain [5, 12].
   * @param via Object representing the message sender (typically the user's wallet) [12].
   * @param opts Options object containing:
   *   - value: The amount of TON (as bigint) sent to the contract. Used to pay for gas and possibly
   *            increase the contract balance [5, 17].
   *   - senderAddress: The address of the sender (typically the admin's address) [18, 19].
   *   - withdrawAmount: The amount of TON (as bigint) to withdraw [15, 20].
   *   - queryID?: Optional 64-bit ID for request-response tracking [4, 15].
   */
  async sendAdminWithdraw(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      senderAddress: Address;
      withdrawAmount: bigint;
      queryID?: number;
    },
  ) {
    const body = beginCell()
      .storeUint(Opcodes.admin_withdraw, 32)
      .storeAddress(opts.senderAddress)
      .storeCoins(opts.withdrawAmount)
      .endCell();

    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      body: body,
    });
  }

  /**
   * @description Wrapper method for sending a 'payment' message to the FunC contract.
   * This method constructs and sends the internal message needed to invoke the 'payment'
   * operation in your contract's `recv_internal` function.
   *
   * @param provider Interface to interact with the blockchain [5, 12].
   * @param via Object representing the message sender [12].
   * @param opts Options object containing:
   *   - value: The amount of TON (as bigint) sent to the contract. This value
   *            is treated as `msg_value` in FunC's `recv_internal`, and is used
   *            to calculate the commission (via commission_deduction) [5, 17].
   *   - sellerAddress: The seller’s address for the payment operation [18, 19].
   *   - queryID?: Optional 64-bit ID for request-response tracking [4, 15].
   */
  async sendPayment(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      sellerAddress: Address;
      queryID?: number;
    ,
  ) {
    const body = beginCell().storeUint(Opcodes.payment, 32).storeAddress(opts.sellerAddress).endCell();

    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      body: body
    });
  }

  async getCommissionDeduction(provider: ContractProvider, value: bigint) {
    const stack = new TupleBuilder();
    stack.writeNumber(value);
    const args = stack.build();
    const result = await provider.get('get_commission_deduction', args);
    return result.stack.readBigNumber();
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
