import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
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

  let sender: SandboxContract<TreasuryContract>;
  let seller: SandboxContract<TreasuryContract>;

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

    const deployResult = await telemora.sendDeploy(deployer.getSender(), toNano('0.05'));
    sender = await blockchain.treasury('sender');
    seller = await blockchain.treasury('seller');

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemora.address,
      deploy: true,
    });
  });

  it('should return the correct admin address', async () => {
    const retrievedAdminAddress = await telemora.getAdminAddress();
    expect(retrievedAdminAddress).not.toBeNull();
    expect(Address.parse(retrievedAdminAddress!)).toEqualAddress(deployer.address);
  });

  it('should return the correct commission percentage', async () => {
    const commission = await telemora.getCommissionPercent();
    expect(commission).toBe(500);
  });

  it('should send a successful payment to an active contract (seller)', async () => {
    const paymentValue = toNano('1');
    const initialSellerBalance = await seller.getBalance();
    const initialMyContractBalance = await telemora.getBalance();

    const sendResult = await telemora.sendMakePayment(sender.getSender(), seller.address, paymentValue);

    expect(sendResult.transactions).toHaveTransaction({
      from: telemora.address,
      to: seller.address,
      value: paymentValue,
      body: beginCell().storeUint(Opcodes.payment, 32).storeUint(0, 64).storeAddress(seller.address).endCell(),
    });

    const finalSellerBalance = await seller.getBalance();
    expect(finalSellerBalance).toBeGreaterThan(initialSellerBalance);

    const finalMyContractBalance = await telemora.getBalance();
    expect(finalMyContractBalance).toBeLessThan(initialMyContractBalance);
  });
  /*
    it('باید پیام را در صورت دریافت توسط آدرس uninit و فعال بودن پرچم bounce، برگشت دهد', async () => {
      const uninitializedAddress = Address.parse('0:0000000000000000000000000000000000000000000000000000000000000001');
      const paymentValue = toNano('0.1');
      const initialMyContractBalance = await telemora.getBalance();
  
      const sendResult = await telemora.sendMakePayment(
        sender.getSender(),
        uninitializedAddress,
        paymentValue
      );
  
      // انتظار داریم تراکنش از 'telemora' به 'uninitializedAddress' ناموفق باشد
      expect(sendResult.transactions).toHaveTransaction({
        from: telemora.address,
        to: uninitializedAddress,
        success: false, // تحویل پیام به آدرس غیرفعال ناموفق است [7]
        // اگر آدرس uninit باشد، پیام به دلیل عدم وجود/مقداردهی اولیه، برگشت داده می‌شود [7-9].
      });
  
      // انتظار یک پیام برگشتی (bounce message) به 'telemora'
      expect(sendResult.transactions).toHaveTransaction({
        from: uninitializedAddress, // منبع پیام برگشتی
        to: telemora.address,
        success: true, // پردازش پیام برگشتی توسط 'telemora' باید موفق باشد
        body: beginCell()
          .storeUint(0xffffffff, 32) // کد عملیاتی استاندارد برای پیام برگشتی [11]
          .storeUint(0, 64) // query_id اصلی (که 0 بود) [2]
          .storeUint(Opcodes.make_payment, 32) // کد عملیاتی اصلی [2]
          .endCell(),
      });
  
      // بررسی موجودی 'telemora' پس از برگشت پیام. باید نزدیک به موجودی اولیه باشد، منهای کارمزدها.
      const finalMyContractBalance = await telemora.getBalance();
      // کارمزدها ابتدا کسر می‌شوند، سپس مقدار بازگردانده می‌شود. بنابراین موجودی نهایی باید کمی کمتر از اولیه باشد.
      expect(finalMyContractBalance).toBeLessThan(initialMyContractBalance);
      expect(initialMyContractBalance - finalMyContractBalance).toBeLessThan(paymentValue); // کارمزدها باید کمتر از مقدار ارسال شده باشند [7]
    });
  
    // سناریو 3: کمبود بودجه در قرارداد شما برای پرداخت
    it('باید کمبود بودجه از سمت فرستنده (telemora) را در هنگام پرداخت مدیریت کند', async () => {
      // مقدار کمی Toncoin به 'telemora' واریز می‌کنیم (کمتر از مقدار پرداخت + حداقل کارمزدها)
      await blockchain.treasury('somebody').send({ to: telemora.address, value: toNano('0.01') });
      const initialMyContractBalance = await telemora.getBalance();
      const paymentValue = toNano('0.5'); // مقداری که 'telemora' نمی‌تواند بپردازد
  
      const sendResult = await telemora.sendMakePayment(
        sender.getSender(),
        seller.address,
        paymentValue
      );
  
      // تراکنش از 'telemora' به 'seller' باید ناموفق باشد، احتمالاً در فاز Action
      expect(sendResult.transactions).toHaveTransaction({
        from: telemora.address,
        to: seller.address,
        aborted: true, // نشان‌دهنده شکست تراکنش که باعث بازگشت می‌شود
      });
  
      // بررسی دقیق‌تر کد خروج فاز Action
      const txFromMyContract = sendResult.transactions.find(tx => tx.from.equals(telemora.address));
      if (txFromMyContract && txFromMyContract.description.type === 'generic' && txFromMyContract.description.actionPhase) {
        // انتظار کد خروج 37 برای "Not enough Toncoin" در فاز Action [13]
        expect(txFromMyContract.description.actionPhase.resultCode).toEqual(37);
      } else {
        // اگر تراکنش به فاز Action نرسیده باشد، ممکن است در فاز Compute یا قبل از آن با مشکل مواجه شده باشد.
        // اما کد 37 به طور خاص مربوط به فاز Action است.
        if (txFromMyContract && txFromMyContract.description.type === 'generic' && txToFailingSeller.description.computePhase.type === 'vm') {
          // اگر فاز Compute موفقیت‌آمیز بوده (کد 0 یا 1)، اما فاز Action شکست خورده، کد خروج آن 37 است.
          expect(txFromMyContract.description.computePhase.exitCode).toBeLessThan(2);
        }
      }
  
      // بررسی موجودی 'telemora' پس از شکست (به دلیل بازگشت کل تراکنش)
      const finalMyContractBalance = await telemora.getBalance();
      // اگر کل تراکنش برگردانده شود، موجودی قرارداد باید تقریباً بدون تغییر باقی بماند [14].
      expect(finalMyContractBalance).toBeCloseTo(initialMyContractBalance, toNano('0.001').toNumber()); // با در نظر گرفتن کارمزدهای بسیار جزئی
    });
  
    // سناریو 4: شکست منطق قرارداد مقصد (فروشنده)
    it('باید پیام را در صورت شکست منطق قرارداد فروشنده، برگشت دهد', async () => {
      // برای این تست، ما نیاز به یک قرارداد mock برای 'seller' داریم که به طور خاص در هنگام دریافت `Opcodes.make_payment` خطا ایجاد کند.
      // در محیط sandbox، اگر از TreasuryContract استفاده کنیم، معمولاً آن فقط مقدار را می‌پذیرد و بدنه پیام را نادیده می‌گیرد.
      // برای تست دقیق "شکست منطق قرارداد"، باید یک قرارداد هوشمند واقعی با منطق `recv_internal` که خطا ایجاد می‌کند، مستقر شود.
      // فرض می‌کنیم `failingSeller` یک قرارداد هوشمند است که وقتی opcode `make_payment` را دریافت می‌کند، `throw(134)` (Invalid argument) [13] می‌کند.
  
      // تعریف یک Mock Contract برای Seller (این بخش نیازمند کامپایل کد FunC/Tact یا شبیه‌سازی دقیق‌تر است)
      // به جای یک TreasuryContract ساده، در یک محیط واقعی، شما یک MockContract از پیش کامپایل شده را اینجا قرار می‌دهید:
      // const mockSellerCode = Cell.fromBoc(Buffer.from('...failing_seller_code_boc...', 'base64'));
      // const failingSeller = blockchain.openContract(new Contract(failingSellerAddress, { code: mockSellerCode, data: Cell.empty() }));
      // await blockchain.send({ to: failingSeller.address, value: toNano('0.1') }); // مقداردهی اولیه به MockSeller
  
      // برای سادگی در این پاسخ، همچنان از `TreasuryContract` به عنوان `failingSeller` استفاده می‌کنیم
      // اما توجه داشته باشید که این تست به طور کامل سناریوی "شکست منطق قرارداد" را بدون یک Mock Contract سفارشی پوشش نمی‌دهد.
      // اگر `TreasuryContract` را به عنوان `failingSeller` استفاده کنیم، پیام برگشت داده نمی‌شود زیرا `TreasuryContract` فقط پول را می‌پذیرد.
      // بنابراین، این تست فقط به عنوان یک `placeholder` برای پیاده‌سازی آینده با یک `MockContract` واقعی عمل می‌کند.
      const failingSeller = await blockchain.treasury('failingSeller'); // در محیط واقعی، این یک قرارداد با منطق شکست خواهد بود
  
      const paymentValue = toNano('0.5');
      const initialMyContractBalance = await telemora.getBalance();
  
      const sendResult = await telemora.sendMakePayment(
        sender.getSender(),
        failingSeller.address, // آدرس قرارداد "فروشنده شکست‌خورده"
        paymentValue
      );
  
      // انتظار داریم تراکنش از 'telemora' به 'failingSeller' ناموفق باشد
      expect(sendResult.transactions).toHaveTransaction({
        from: telemora.address,
        to: failingSeller.address,
        success: false, // فاز Compute قرارداد failingSeller باید شکست بخورد [17]
      });
  
      // بررسی کد خروج فاز Compute در تراکنش به `failingSeller`
      const txToFailingSeller = sendResult.transactions.find(tx => tx.to.equals(failingSeller.address));
      if (txToFailingSeller && txToFailingSeller.description.type === 'generic' && txToFailingSeller.description.computePhase.type === 'vm') {
        // اگر قرارداد mock به صراحت خطا ایجاد کند، کد خروج آن > 1 خواهد بود [13].
        // برای خطای 134 "Invalid argument" از Tact/FunC [13]، انتظار `toEqual(134)` را داریم.
        expect(txToFailingSeller.description.computePhase.exitCode).toBeGreaterThanOrEqual(2); // نمونه‌ای از کد خروج ناموفق
      }
  
      // انتظار یک پیام برگشتی از `failingSeller` به `telemora`
      expect(sendResult.transactions).toHaveTransaction({
        from: failingSeller.address,
        to: telemora.address,
        success: true, // پردازش پیام برگشتی توسط `telemora` باید موفق باشد
        body: beginCell()
          .storeUint(0xffffffff, 32) // کد عملیاتی استاندارد پیام برگشتی [11]
          .storeUint(0, 64) // query_id اصلی
          .storeUint(Opcodes.make_payment, 32) // کد عملیاتی اصلی
          .endCell(),
      });
  
      // بررسی موجودی 'telemora' پس از برگشت پیام (باید نزدیک به موجودی اولیه، منهای کارمزدهای پیام اصلی باشد)
      const finalMyContractBalance = await telemora.getBalance();
      expect(finalMyContractBalance).toBeLessThan(initialMyContractBalance);
      expect(initialMyContractBalance - finalMyContractBalance).toBeLessThan(paymentValue); // کارمزدها باید کمتر از مقدار ارسال شده باشند
    });*/
});
