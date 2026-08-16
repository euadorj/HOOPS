import { Injectable } from '@angular/core';

export interface StockQuote {
  symbol: string;
  name: string;

  priceUsd: number;
  priceSgd: number;

  changePercent: number;

  isLive: boolean;
  updatedAt: number;
}

interface StockDefinition {
  symbol: string;
  name: string;
  fallbackPriceUsd: number;
}

interface FinnhubQuoteResponse {
  c?: number;
  dp?: number;
  t?: number;
}

@Injectable({
  providedIn: 'root',
})
export class StockService {

  /*
   * Paste your Finnhub API key here.
   *
   * The application still works without a key.
   * It will automatically use fallback demo prices.
   */
  private readonly apiKey =
    'PASTE_YOUR_FINNHUB_API_KEY_HERE';


  /*
   * DEMO EXCHANGE RATE
   *
   * 1 USD = S$1.35
   *
   * Stock market data is fetched in USD,
   * but everything shown and purchased
   * inside the app is converted to SGD.
   */
  private readonly usdToSgdRate = 1.35;


  /*
   * Prevent excessive API calls.
   * Prices are cached for 60 seconds.
   */
  private readonly cacheDurationMs =
    60 * 1000;


  private cachedQuotes:
    StockQuote[] | null = null;

  private cacheTimestamp = 0;


  /*
   * Stocks available in the prototype.
   */
  private readonly supportedStocks:
    StockDefinition[] = [

    {
      symbol: 'AAPL',
      name: 'Apple',
      fallbackPriceUsd: 203.70,
    },

    {
      symbol: 'MSFT',
      name: 'Microsoft',
      fallbackPriceUsd: 370.37,
    },

    {
      symbol: 'NVDA',
      name: 'NVIDIA',
      fallbackPriceUsd: 203.70,
    },

    {
      symbol: 'TSLA',
      name: 'Tesla',
      fallbackPriceUsd: 351.85,
    },

    {
      symbol: 'AMZN',
      name: 'Amazon',
      fallbackPriceUsd: 185.19,
    },

    {
      symbol: 'GOOGL',
      name: 'Alphabet',
      fallbackPriceUsd: 162.96,
    },

  ];


  getUsdToSgdRate(): number {
    return this.usdToSgdRate;
  }


  hasLiveApiKey(): boolean {
    return (
      this.apiKey.length > 10 &&
      this.apiKey !==
        'PASTE_YOUR_FINNHUB_API_KEY_HERE'
    );
  }


  async getStockQuotes(
    forceRefresh = false
  ): Promise<StockQuote[]> {

    const now = Date.now();

    const cacheStillValid =
      this.cachedQuotes !== null &&
      now - this.cacheTimestamp <
        this.cacheDurationMs;


    if (
      !forceRefresh &&
      cacheStillValid
    ) {

      return this.cachedQuotes!
        .map((quote) => ({
          ...quote,
        }));
    }


    const quotes =
      await Promise.all(
        this.supportedStocks.map(
          (stock) =>
            this.fetchStockQuote(stock)
        )
      );


    this.cachedQuotes = quotes;

    this.cacheTimestamp = Date.now();


    return quotes.map(
      (quote) => ({
        ...quote,
      })
    );
  }


  private async fetchStockQuote(
    stock: StockDefinition
  ): Promise<StockQuote> {

    /*
     * No API key?
     *
     * Do not make a failed HTTP call.
     * Immediately return demo data.
     */
    if (!this.hasLiveApiKey()) {
      return this.createFallbackQuote(
        stock
      );
    }


    const controller =
      new AbortController();


    /*
     * Stop waiting after 6 seconds.
     * This prevents the page hanging
     * if the API has a problem.
     */
    const timeout =
      setTimeout(
        () => controller.abort(),
        6000
      );


    try {

      const url =
        'https://finnhub.io/api/v1/quote' +
        `?symbol=${encodeURIComponent(
          stock.symbol
        )}` +
        `&token=${encodeURIComponent(
          this.apiKey
        )}`;


      const response =
        await fetch(
          url,
          {
            method: 'GET',
            signal: controller.signal,
          }
        );


      if (!response.ok) {

        throw new Error(
          `Stock API returned HTTP ${response.status}`
        );
      }


      const data: FinnhubQuoteResponse =
  await response.json();


      const priceUsd =
        Number(data.c);


      if (
        !Number.isFinite(priceUsd) ||
        priceUsd <= 0
      ) {

        throw new Error(
          `Invalid price received for ${stock.symbol}`
        );
      }


      const changePercent =
        Number(data.dp);


      const timestamp =
        Number(data.t);


      return {

        symbol:
          stock.symbol,

        name:
          stock.name,

        priceUsd:
          this.roundMoney(
            priceUsd
          ),

        priceSgd:
          this.roundMoney(
            priceUsd *
            this.usdToSgdRate
          ),

        changePercent:
          Number.isFinite(
            changePercent
          )
            ? changePercent
            : 0,

        isLive:
          true,

        updatedAt:
          Number.isFinite(timestamp) &&
          timestamp > 0
            ? timestamp * 1000
            : Date.now(),

      };

    } catch (error) {

      console.warn(
        `Unable to get live price for ${stock.symbol}. ` +
        'Using fallback price.',
        error
      );


      return this.createFallbackQuote(
        stock
      );

    } finally {

      clearTimeout(timeout);
    }
  }


  private createFallbackQuote(
    stock: StockDefinition
  ): StockQuote {

    return {

      symbol:
        stock.symbol,

      name:
        stock.name,

      priceUsd:
        stock.fallbackPriceUsd,

      priceSgd:
        this.roundMoney(
          stock.fallbackPriceUsd *
          this.usdToSgdRate
        ),

      changePercent:
        0,

      isLive:
        false,

      updatedAt:
        Date.now(),

    };
  }


  private roundMoney(
    amount: number
  ): number {

    return (
      Math.round(
        (
          amount +
          Number.EPSILON
        ) * 100
      ) / 100
    );
  }
}
