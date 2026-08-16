import {
  Component,
  OnInit,
} from '@angular/core';

import {
  AlertController,
  ToastController,
} from '@ionic/angular';

import {
  DashboardInvestment,
  DashboardService,
} from '../THIERRY/dashboard.service';

import {
  SavingsService,
} from '../THIERRY/savings.service';

import {
  StockQuote,
  StockService,
} from '../THIERRY/stock.service';


@Component({
  selector:
    'app-investing',

  templateUrl:
    './investing.page.html',

  styleUrls: [
    './investing.page.scss',
  ],

  standalone:
    false,
})
export class InvestingPage
  implements OnInit {

  investments:
    DashboardInvestment[] = [];


  marketStocks:
    StockQuote[] = [];


  totalInvestmentValue =
    0;

  totalInvestedAmount =
    0;

  totalProfitLoss =
    0;

  totalProfitLossPercent =
    0;


  availableBalance =
    0;


  loadingPrices =
    false;


  priceStatus =
    'Loading stock prices...';


  usdToSgdRate =
    1.35;


  constructor(
    private dashboardService:
      DashboardService,

    private savingsService:
      SavingsService,

    private stockService:
      StockService,

    private alertController:
      AlertController,

    private toastController:
      ToastController
  ) {}


  ngOnInit():
    void {

    this.usdToSgdRate =
      this.stockService
        .getUsdToSgdRate();


    this.loadPortfolio();
  }


  ionViewWillEnter():
    void {

    this.loadPortfolio();


    void this.refreshPrices(
      false
    );
  }


  /*
   * =====================================
   * LOAD PORTFOLIO
   * =====================================
   */
  loadPortfolio():
    void {

    this.investments =
      this.dashboardService
        .getInvestments();


    this.availableBalance =
      this.savingsService
        .getFinanceData()
        .balance;


    this.totalInvestmentValue =
      this.investments
        .reduce(
          (
            total,
            investment
          ) =>
            total +
            investment.currentValue,
          0
        );


    this.totalInvestedAmount =
      this.investments
        .reduce(
          (
            total,
            investment
          ) =>
            total +
            investment.investedAmount,
          0
        );


    this.totalProfitLoss =
      this.totalInvestmentValue -
      this.totalInvestedAmount;


    if (
      this.totalInvestedAmount <= 0
    ) {

      this.totalProfitLossPercent =
        0;

    } else {

      this.totalProfitLossPercent =
        (
          this.totalProfitLoss /
          this.totalInvestedAmount
        ) * 100;
    }
  }


  /*
   * =====================================
   * REFRESH STOCK PRICES
   * =====================================
   */
  async refreshPrices(
    forceRefresh = true
  ): Promise<void> {

    if (
      this.loadingPrices
    ) {

      return;
    }


    this.loadingPrices =
      true;


    this.priceStatus =
      'Updating stock prices...';


    try {

      const quotes =
        await this.stockService
          .getStockQuotes(
            forceRefresh
          );


      this.marketStocks =
        quotes;


      /*
       * Update holdings with
       * latest prices
       */
      this.dashboardService
        .updateInvestmentPrices(

          quotes.map(
            (quote) => ({

              symbol:
                quote.symbol,

              priceSgd:
                quote.priceSgd,

            })
          )

        );


      this.loadPortfolio();


      /*
       * Update homepage dashboard
       */
      this.notifyDashboardUpdate();


      const liveCount =
        quotes.filter(
          (quote) =>
            quote.isLive
        ).length;


      if (
        liveCount ===
        quotes.length
      ) {

        this.priceStatus =
          'Live market prices';

      } else if (
        liveCount > 0
      ) {

        this.priceStatus =
          'Live prices with fallback data';

      } else if (
        !this.stockService
          .hasLiveApiKey()
      ) {

        this.priceStatus =
          'Demo prices';

      } else {

        this.priceStatus =
          'Live prices unavailable - showing fallback prices';
      }

    } catch (error) {

      console.warn(
        'Unable to refresh stock prices:',
        error
      );


      this.priceStatus =
        'Unable to update prices';

    } finally {

      this.loadingPrices =
        false;
    }
  }


  /*
   * =====================================
   * BUY UNITS
   * =====================================
   */
  async buyUnits(
    stock:
      StockQuote
  ): Promise<void> {

    const alert =
      await this
        .alertController
        .create({

          header:
            `Buy ${stock.symbol}`,

          subHeader:
            stock.name,

          message:
            `Price per unit: S$${stock.priceSgd.toFixed(2)}. ` +
            `Available balance: S$${this.availableBalance.toFixed(2)}. ` +
            'Enter the number of whole units you want to buy.',


          inputs: [

            {
              name:
                'units',

              type:
                'number',

              min:
                1,

              value:
                1,

              placeholder:
                'Number of units',
            },

          ],


          buttons: [

            {
              text:
                'Cancel',

              role:
                'cancel',
            },


            {
              text:
                'Buy',

              handler:
                (data) => {

                  const units =
                    Number(
                      data.units
                    );


                  /*
                   * Whole units only
                   */
                  if (
                    !Number.isFinite(
                      units
                    ) ||
                    !Number.isInteger(
                      units
                    ) ||
                    units <= 0
                  ) {

                    void this
                      .presentToast(
                        'Please enter a whole number of units, such as 1, 2 or 3.',
                        'danger'
                      );


                    return false;
                  }


                  const totalCost =
                    units *
                    stock.priceSgd;


                  /*
                   * Balance check
                   */
                  if (
                    totalCost >
                    this.availableBalance
                  ) {

                    void this
                      .presentToast(
                        `You need S$${totalCost.toFixed(2)}, ` +
                        `but your available balance is S$${this.availableBalance.toFixed(2)}.`,
                        'danger'
                      );


                    return false;
                  }


                  const result =
                    this.dashboardService
                      .buyStockUnits(

                        stock.symbol,

                        stock.name,

                        units,

                        stock.priceSgd

                      );


                  void this
                    .presentToast(

                      result.message,

                      result.success
                        ? 'success'
                        : 'danger'

                    );


                  if (
                    result.success
                  ) {

                    /*
                     * Refresh Investing page
                     */
                    this.loadPortfolio();


                    /*
                     * Refresh homepage
                     */
                    this.notifyDashboardUpdate();


                    return true;
                  }


                  return false;
                },
            },

          ],
        });


    await alert.present();
  }


  /*
   * =====================================
   * SELL SELECTED UNITS
   * =====================================
   */
  async sellUnits(
    investment:
      DashboardInvestment
  ): Promise<void> {

    /*
     * Try current market price first.
     *
     * If unavailable, use last saved
     * market price.
     */
    const quote =
      this.getQuoteForSymbol(
        investment.symbol
      );


    const currentPrice =
      quote?.priceSgd ??
      investment.lastPriceSgd;


    if (
      !Number.isFinite(
        currentPrice
      ) ||
      currentPrice <= 0
    ) {

      await this
        .presentToast(
          'Unable to get the current stock price.',
          'danger'
        );


      return;
    }


    const alert =
      await this
        .alertController
        .create({

          header:
            `Sell ${investment.symbol}`,

          subHeader:
            investment.name,

          message:
            `You own ${investment.shares} ` +
            `${investment.shares === 1 ? 'unit' : 'units'}. ` +
            `Current price: S$${currentPrice.toFixed(2)} per unit. ` +
            'Enter the number of whole units you want to sell.',


          inputs: [

            {
              name:
                'units',

              type:
                'number',

              min:
                1,

              max:
                investment.shares,

              value:
                1,

              placeholder:
                'Number of units to sell',
            },

          ],


          buttons: [

            {
              text:
                'Cancel',

              role:
                'cancel',
            },


            {
              text:
                'Sell',

              role:
                'destructive',

              handler:
                (data) => {

                  const units =
                    Number(
                      data.units
                    );


                  /*
                   * Must be whole units
                   */
                  if (
                    !Number.isFinite(
                      units
                    ) ||
                    !Number.isInteger(
                      units
                    ) ||
                    units <= 0
                  ) {

                    void this
                      .presentToast(
                        'Please enter a whole number of units to sell.',
                        'danger'
                      );


                    return false;
                  }


                  /*
                   * Cannot sell more
                   * than currently owned.
                   */
                  if (
                    units >
                    investment.shares
                  ) {

                    void this
                      .presentToast(
                        `You only own ${investment.shares} ` +
                        `${investment.shares === 1 ? 'unit' : 'units'}.`,
                        'danger'
                      );


                    return false;
                  }


                  const saleValue =
                    units *
                    currentPrice;


                  const result =
                    this.dashboardService
                      .sellStockUnits(

                        investment.symbol,

                        units,

                        currentPrice

                      );


                  void this
                    .presentToast(

                      result.message,

                      result.success
                        ? 'success'
                        : 'danger'

                    );


                  if (
                    result.success
                  ) {

                    /*
                     * Refresh Investing page
                     */
                    this.loadPortfolio();


                    /*
                     * Refresh homepage dashboard
                     */
                    this.notifyDashboardUpdate();


                    return true;
                  }


                  return false;
                },
            },

          ],
        });


    await alert.present();
  }


  /*
   * =====================================
   * FIND MARKET QUOTE
   * =====================================
   */
  getQuoteForSymbol(
    symbol:
      string
  ): StockQuote | undefined {

    return this
      .marketStocks
      .find(
        (stock) =>
          stock.symbol
            .toUpperCase() ===
          symbol
            .toUpperCase()
      );
  }


  /*
   * =====================================
   * PROFIT / LOSS
   * =====================================
   */
  getInvestmentProfit(
    investment:
      DashboardInvestment
  ): number {

    return (
      investment.currentValue -
      investment.investedAmount
    );
  }


  getInvestmentProfitPercent(
    investment:
      DashboardInvestment
  ): number {

    if (
      investment.investedAmount <= 0
    ) {

      return 0;
    }


    return (
      (
        this.getInvestmentProfit(
          investment
        ) /
        investment.investedAmount
      ) * 100
    );
  }


  /*
   * =====================================
   * TRACK BY
   * =====================================
   */
  trackByInvestmentId(
    index:
      number,

    investment:
      DashboardInvestment
  ): string {

    return investment.id;
  }


  trackByStockSymbol(
    index:
      number,

    stock:
      StockQuote
  ): string {

    return stock.symbol;
  }


  /*
   * =====================================
   * UPDATE HOMEPAGE
   * =====================================
   */
  private notifyDashboardUpdate():
    void {

    window.dispatchEvent(
      new CustomEvent(
        'portfolio-updated'
      )
    );
  }


  /*
   * =====================================
   * TOAST
   * =====================================
   */
  private async presentToast(
    message:
      string,

    color:
      string
  ): Promise<void> {

    const toast =
      await this
        .toastController
        .create({

          message,

          duration:
            2500,

          position:
            'bottom',

          color,
        });


    await toast.present();
  }
}