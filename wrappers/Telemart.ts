import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TelemartConfig = {
    owner: Address;
};

export function telemartConfigToCell(config: TelemartConfig): Cell {
    return beginCell().storeAddress(config.owner).endCell();
}

export class Telemart implements Contract {
    readonly provider?: ContractProvider;

    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Telemart(address);
    }

    static createFromConfig(config: TelemartConfig, code: Cell, workchain = 0): Telemart {
        const data = telemartConfigToCell(config);
        const init = { code, data };
        return new Telemart(contractAddress(workchain, init), init);
    }

    async sendDeploy(via: Sender, value: bigint) {
        await this.provider!.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendInternal(via: Sender, params: { value: bigint; body: Cell }) {
        if (!this.provider) {
            throw new Error('Provider is undefined.');
        }

        return await this.provider.internal(via, {
            value: params.value,
            body: params.body,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }
}
