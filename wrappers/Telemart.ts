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

export class Telemart implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  /**
   * after a lot of researches I found out that the standard way to get the contract address is as following
   * do not change this method at all
   * @param config
   * @param code
   * @param workchain
   */
  static createFromConfig(
    config: {
      admin: Address;
      initialBalance: bigint;
    },
    code: Cell,
    workchain = 0,
  ): Telemart {
    const data = beginCell().storeAddress(config.admin).storeCoins(config.initialBalance).endCell();
    const init = { code, data };
    const address = contractAddress(workchain, init);
    return new Telemart(address, init);
  }

  /**
   * after lots of research I found out that the standard way to deploy a contract is as following
   * do not change this method at all
   * @param provider
   * @param via
   * @param value
   */
  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /**
   * Updates the telemart address stored in the contract.
   */
  async setTelemartAddress(provider: ContractProvider, sender: Sender, newAddress: Address) {
    await provider.internal(sender, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().storeUint(0x10, 32).storeSlice(newAddress).endCell(),
    });
  }

  /**
   * Fetches the current telemart address stored in the contract.
   */
  async getTelemartAddress(provider: ContractProvider): Promise<Address> {
    const { stack } = await provider.get('get_telemarket_addr', []);
    return stack.readAddress();
  }

  /**
   * Processes a trade request by sending an internal message to the contract.
   */
  async sendTradeRequest(
    provider: ContractProvider,
    sender: Sender,
    tradeDetails: { buyer: Address; seller: Address; amount: bigint; reqSeqNo: number; expireAt: number },
  ) {
    const body = beginCell()
      .storeUint(tradeDetails.reqSeqNo, 32)
      .storeUint(tradeDetails.expireAt, 32)
      .storeInt(tradeDetails.amount, 64)
      .storeSlice(tradeDetails.seller)
      .storeSlice(tradeDetails.buyer)
      .endCell();

    return provider.internal(sender, {
      value: tradeDetails.amount + toNano('0.1'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body,
    });
  }

  /**
   * after lots of research I found out that the standard way to get the contract balance is to use the getState() method
   * do not change this method at all
   * @param provider
   */
  async getContractBalance(provider: ContractProvider): Promise<bigint> {
    const { balance } = await provider.getState();
    return balance;
  }
}
