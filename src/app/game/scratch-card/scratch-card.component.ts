import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import {
  AuthService,
} from '../../auth/auth.service';

import {
  CoinService,
} from '../coin.service';

import {
  RewardsService,
} from '../rewards.service';


type ScratchRewardType =
  | 'coins'
  | 'cashback'
  | 'voucher';


interface ScratchReward {
  label: string;
  value: string;
  emoji: string;
  type: ScratchRewardType;
  amount: number;
}


interface RewardHistoryItem {
  label: string;
  value: string;
  emoji: string;
  type: ScratchRewardType;
  amount: number;
  status: string;
  wonAt: number;
}


@Component({
  selector: 'app-scratch-card',
  templateUrl: './scratch-card.component.html',
  styleUrls: ['./scratch-card.component.scss'],
  standalone: false,
})
export class ScratchCardComponent
  implements OnInit, AfterViewInit, OnDestroy {

  /*
   * =====================================
   * SCRATCH CANVAS
   * =====================================
   */

  @ViewChild('scratchCanvas')
  scratchCanvas!:
    ElementRef<HTMLCanvasElement>;


  private scratchContext:
    CanvasRenderingContext2D | null = null;


  private isScratching = false;

  private lastX = 0;

  private lastY = 0;

  private scratchMoveCounter = 0;


  /*
   * Scratch 45% of the card
   * before the prize is claimed.
   */
  private readonly SCRATCH_REVEAL_PERCENT = 45;


  /*
   * Larger number =
   * easier/faster scratching.
   */
  private readonly SCRATCH_BRUSH_SIZE = 42;


  /*
   * TEST MODE
   *
   * New card every 30 seconds.
   *
   * For 24 hours use:
   *
   * 24 * 60 * 60 * 1000
   */
  private readonly SCRATCH_INTERVAL_MS = 30 * 1000;


  scratchPercent = 0;


  /*
   * =====================================
   * OUTPUTS
   * =====================================
   */

  @Output()
  close =
    new EventEmitter<void>();


  @Output()
  rewardClaimed =
    new EventEmitter<void>();


  /*
   * =====================================
   * POSSIBLE SCRATCH REWARDS
   * =====================================
   */

  rewards: ScratchReward[] = [

    {
      label: '50 Coins',
      value: '50_coins',
      emoji: '🪙',
      type: 'coins',
      amount: 50,
    },

    {
      label: '$1 Cashback',
      value: '1_cash',
      emoji: '💵',
      type: 'cashback',
      amount: 1,
    },

    {
      /*
       * If this reward is selected,
       * RewardsService will choose
       * one REAL voucher from your
       * voucher catalogue.
       */
      label: 'Voucher',
      value: 'voucher',
      emoji: '🎟️',
      type: 'voucher',
      amount: 1,
    },

  ];


  selectedReward:
    ScratchReward | null = null;


  revealed = false;

  availableNow = true;


  rewardAmountDisplay = '';

  rewardMessage = '';


  recentRewards:
    RewardHistoryItem[] = [];


  private availabilityTimer:
    ReturnType<typeof setInterval> | null = null;


  constructor(
    private authService: AuthService,
    private coinService: CoinService,
    private rewardsService: RewardsService
  ) {}


  /*
   * =====================================
   * INITIALISE
   * =====================================
   */

  ngOnInit(): void {

    this.checkAvailability();

    this.loadRewardHistory();


    /*
     * Select the reward before
     * the user scratches.
     *
     * The reward is hidden underneath
     * the scratch layer.
     *
     * It is NOT awarded yet.
     */
    if (this.availableNow) {

      this.prepareReward();
    }


    /*
     * Useful for your 30-second
     * testing cooldown.
     */
    this.availabilityTimer =
      setInterval(
        () => {

          this.refreshAvailability();

        },
        1000
      );
  }


  ngAfterViewInit(): void {

    /*
     * Give HTML time to render
     * before measuring canvas size.
     */
    setTimeout(
      () => {

        this.setupScratchCard();

      },
      100
    );
  }


  ngOnDestroy(): void {

    if (this.availabilityTimer) {

      clearInterval(
        this.availabilityTimer
      );


      this.availabilityTimer = null;
    }
  }


  /*
   * =====================================
   * PICK RANDOM REWARD
   * =====================================
   */

  pickRandomReward():
    ScratchReward {

    const randomIndex =
      Math.floor(
        Math.random() *
        this.rewards.length
      );


    /*
     * Return a copy so changing
     * the voucher label later does
     * not modify the main reward list.
     */
    return {
      ...this.rewards[randomIndex],
    };
  }


  private prepareReward(): void {

    this.selectedReward =
      this.pickRandomReward();


    this.revealed = false;

    this.scratchPercent = 0;

    this.rewardAmountDisplay = '';

    this.rewardMessage = '';
  }


  /*
   * =====================================
   * CREATE SCRATCHABLE SILVER LAYER
   * =====================================
   */

  private setupScratchCard(): void {

    if (
      !this.availableNow ||
      this.revealed
    ) {

      return;
    }


    const canvas =
      this.scratchCanvas
        ?.nativeElement;


    if (!canvas) {

      return;
    }


    const rect =
      canvas.getBoundingClientRect();


    const width =
      Math.max(
        1,
        Math.round(
          rect.width
        )
      );


    const height =
      Math.max(
        1,
        Math.round(
          rect.height
        )
      );


    const pixelRatio =
      window.devicePixelRatio || 1;


    /*
     * Make canvas sharp on
     * phones and Retina displays.
     */
    canvas.width =
      Math.round(
        width *
        pixelRatio
      );


    canvas.height =
      Math.round(
        height *
        pixelRatio
      );


    const context =
      canvas.getContext(
        '2d'
      );


    if (!context) {

      return;
    }


    /*
     * Drawing coordinates use
     * normal CSS pixel sizes.
     */
    context.setTransform(
      pixelRatio,
      0,
      0,
      pixelRatio,
      0,
      0
    );


    this.scratchContext =
      context;


    /*
     * Normal drawing mode.
     */
    context.globalCompositeOperation =
      'source-over';


    /*
     * SILVER GRADIENT
     */
    const gradient =
      context.createLinearGradient(
        0,
        0,
        width,
        height
      );


    gradient.addColorStop(
      0,
      '#bfc4cc'
    );


    gradient.addColorStop(
      0.2,
      '#eef0f3'
    );


    gradient.addColorStop(
      0.4,
      '#c5cad1'
    );


    gradient.addColorStop(
      0.6,
      '#f4f5f6'
    );


    gradient.addColorStop(
      0.8,
      '#c0c5cd'
    );


    gradient.addColorStop(
      1,
      '#e9ebee'
    );


    context.fillStyle =
      gradient;


    context.fillRect(
      0,
      0,
      width,
      height
    );


    /*
     * Add diagonal pattern
     * to imitate scratch foil.
     */
    context.save();


    context.globalAlpha =
      0.12;


    context.strokeStyle =
      '#475569';


    context.lineWidth =
      1;


    for (
      let x = -height;
      x < width + height;
      x += 18
    ) {

      context.beginPath();


      context.moveTo(
        x,
        0
      );


      context.lineTo(
        x + height,
        height
      );


      context.stroke();
    }


    context.restore();


    /*
     * White panel in centre.
     */
    context.fillStyle =
      'rgba(255, 255, 255, 0.78)';


    this.drawRoundedRectangle(
      context,
      width / 2 - 105,
      height / 2 - 42,
      210,
      84,
      12
    );


    context.fill();


    /*
     * Icon
     */
    context.textAlign =
      'center';


    context.textBaseline =
      'middle';


    context.font =
      '28px Arial';


    context.fillStyle =
      '#334155';


    context.fillText(
      '🪙',
      width / 2,
      height / 2 - 18
    );


    /*
     * Main scratch text
     */
    context.font =
      'bold 17px Arial';


    context.fillStyle =
      '#1e293b';


    context.fillText(
      'SCRATCH HERE',
      width / 2,
      height / 2 + 13
    );


    /*
     * Small instruction
     */
    context.font =
      '12px Arial';


    context.fillStyle =
      '#64748b';


    context.fillText(
      'Drag your finger or mouse',
      width / 2,
      height / 2 + 34
    );


    /*
     * Everything drawn after this
     * ERASES the silver covering.
     */
    context.globalCompositeOperation =
      'destination-out';
  }


  /*
   * =====================================
   * START SCRATCHING
   * =====================================
   */

  startScratching(
    event: PointerEvent
  ): void {

    if (
      !this.availableNow ||
      this.revealed
    ) {

      return;
    }


    event.preventDefault();


    const canvas =
      this.scratchCanvas
        ?.nativeElement;


    if (
      !canvas ||
      !this.scratchContext
    ) {

      return;
    }


    this.isScratching =
      true;


    this.scratchMoveCounter =
      0;


    try {

      canvas.setPointerCapture(
        event.pointerId
      );

    } catch {

      /*
       * Pointer capture is not
       * required on every browser.
       */
    }


    const point =
      this.getPointerPosition(
        event
      );


    this.lastX =
      point.x;


    this.lastY =
      point.y;


    /*
     * Make first scratched area
     * immediately.
     */
    this.eraseCircle(
      point.x,
      point.y
    );


    this.checkScratchPercentage();
  }


  /*
   * =====================================
   * CONTINUE SCRATCHING
   * =====================================
   */

  scratch(
    event: PointerEvent
  ): void {

    if (
      !this.isScratching ||
      !this.availableNow ||
      this.revealed
    ) {

      return;
    }


    event.preventDefault();


    const point =
      this.getPointerPosition(
        event
      );


    /*
     * Draw continuous erased line
     * between previous and current
     * pointer position.
     */
    this.eraseLine(
      this.lastX,
      this.lastY,
      point.x,
      point.y
    );


    this.lastX =
      point.x;


    this.lastY =
      point.y;


    this.scratchMoveCounter++;


    /*
     * Check percentage every
     * few movements for performance.
     */
    if (
      this.scratchMoveCounter % 5 === 0
    ) {

      this.checkScratchPercentage();
    }
  }


  /*
   * =====================================
   * STOP SCRATCHING
   * =====================================
   */

  stopScratching(
    event?: PointerEvent
  ): void {

    if (!this.isScratching) {

      return;
    }


    this.isScratching =
      false;


    const canvas =
      this.scratchCanvas
        ?.nativeElement;


    if (
      canvas &&
      event
    ) {

      try {

        if (
          canvas.hasPointerCapture(
            event.pointerId
          )
        ) {

          canvas.releasePointerCapture(
            event.pointerId
          );
        }

      } catch {

        /*
         * Nothing required.
         */
      }
    }


    this.checkScratchPercentage();
  }


  /*
   * =====================================
   * ERASE CIRCLE
   * =====================================
   */

  private eraseCircle(
    x: number,
    y: number
  ): void {

    const context =
      this.scratchContext;


    if (!context) {

      return;
    }


    context.beginPath();


    context.arc(
      x,
      y,
      this.SCRATCH_BRUSH_SIZE / 2,
      0,
      Math.PI * 2
    );


    context.fill();


    context.closePath();
  }


  /*
   * =====================================
   * ERASE LINE
   * =====================================
   */

  private eraseLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): void {

    const context =
      this.scratchContext;


    if (!context) {

      return;
    }


    context.beginPath();


    context.lineWidth =
      this.SCRATCH_BRUSH_SIZE;


    context.lineCap =
      'round';


    context.lineJoin =
      'round';


    context.moveTo(
      startX,
      startY
    );


    context.lineTo(
      endX,
      endY
    );


    context.stroke();


    context.closePath();
  }


  /*
   * =====================================
   * POINTER POSITION
   * =====================================
   */

  private getPointerPosition(
    event: PointerEvent
  ): {
    x: number;
    y: number;
  } {

    const canvas =
      this.scratchCanvas
        .nativeElement;


    const rect =
      canvas
        .getBoundingClientRect();


    return {

      x:
        event.clientX -
        rect.left,

      y:
        event.clientY -
        rect.top,

    };
  }


  /*
   * =====================================
   * CHECK SCRATCH PERCENTAGE
   * =====================================
   */

  private checkScratchPercentage(): void {

    if (
      this.revealed ||
      !this.availableNow
    ) {

      return;
    }


    const canvas =
      this.scratchCanvas
        ?.nativeElement;


    const context =
      this.scratchContext;


    if (
      !canvas ||
      !context
    ) {

      return;
    }


    try {

      const imageData =
        context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );


      const pixels =
        imageData.data;


      let checkedPixels =
        0;


      let transparentPixels =
        0;


      /*
       * Alpha value is every
       * fourth item.
       *
       * We sample rather than checking
       * every individual pixel.
       */
      for (
        let index = 3;
        index < pixels.length;
        index += 80
      ) {

        checkedPixels++;


        /*
         * Very low alpha means
         * the foil has been scratched off.
         */
        if (
          pixels[index] < 25
        ) {

          transparentPixels++;
        }
      }


      if (
        checkedPixels <= 0
      ) {

        return;
      }


      const percentage =
        (
          transparentPixels /
          checkedPixels
        ) * 100;


      this.scratchPercent =
        Math.min(
          100,
          Math.round(
            percentage
          )
        );


      /*
       * Automatically claim reward
       * once 45% is scratched.
       */
      if (
        percentage >=
        this.SCRATCH_REVEAL_PERCENT
      ) {

        this.completeScratch();
      }

    } catch (error) {

      console.warn(
        'Unable to calculate scratch percentage:',
        error
      );
    }
  }


  /*
   * =====================================
   * COMPLETE SCRATCH
   * =====================================
   */

  private async completeScratch(): Promise<void> {

    /*
     * Prevent duplicate rewards.
     */
    if (
      this.revealed ||
      !this.availableNow
    ) {

      return;
    }


    /*
     * Safety fallback.
     */
    if (!this.selectedReward) {

      this.selectedReward =
        this.pickRandomReward();
    }


    /*
     * Mark as revealed BEFORE
     * applying reward.
     *
     * This prevents accidental
     * duplicate rewards.
     */
    this.revealed =
      true;


    this.scratchPercent =
      100;


    /*
     * Actually give user reward.
     */
    await this.applyReward(
      this.selectedReward
    );


    /*
     * Save into recent scratch
     * reward history.
     *
     * If the reward was a voucher,
     * applyReward() changes the label
     * to the ACTUAL won voucher first.
     */
    const historyItem:
      RewardHistoryItem = {

      ...this.selectedReward,

      status:
        'Won',

      wonAt:
        Date.now(),
    };


    this.recentRewards.unshift(
      historyItem
    );


    /*
     * Keep latest 5.
     */
    this.recentRewards =
      this.recentRewards.slice(
        0,
        5
      );


    this.saveRewardHistory();


    /*
     * Start scratch-card cooldown.
     */
    localStorage.setItem(
      this.getLastRevealStorageKey(),
      String(
        Date.now()
      )
    );


    this.availableNow =
      false;


    /*
     * Tell Games page to refresh
     * coin/reward displays.
     */
    this.rewardClaimed.emit();


    /*
     * Also notify other pages that
     * rewards may have changed.
     */
    window.dispatchEvent(
      new CustomEvent(
        'rewards-updated'
      )
    );
  }


  /*
   * =====================================
   * APPLY REWARD
   * =====================================
   */

  private async applyReward(
    reward: ScratchReward
  ): Promise<void> {

    switch (
      reward.type
    ) {

      /*
       * =================================
       * COINS
       * =================================
       */
      case 'coins': {

        const newCoinBalance =
          await this.coinService
            .addCoins(
              reward.amount
            );


        this.rewardAmountDisplay =
          String(
            reward.amount
          );


        this.rewardMessage =
          `${reward.amount} coins were added. ` +
          `Your coin balance is now ${newCoinBalance}.`;


        break;
      }


      /*
       * =================================
       * CASHBACK
       * =================================
       */
      case 'cashback': {

        const currentCashback =
          this.getCashbackBalance();


        const newCashback =
          currentCashback +
          reward.amount;


        localStorage.setItem(
          this.getCashbackStorageKey(),
          String(
            newCashback
          )
        );


        this.rewardAmountDisplay =
          `$${reward.amount.toFixed(2)}`;


        this.rewardMessage =
          `$${reward.amount.toFixed(2)} cashback ` +
          'was added to your account.';


        break;
      }


      /*
       * =================================
       * REAL VOUCHER
       * =================================
       */
      case 'voucher': {

        /*
         * RewardsService randomly picks
         * one voucher from:
         *
         * - NTUC
         * - Grab
         * - Shopee
         * - McDonald's
         * - Popular
         * - Starbucks
         *
         * No coins are deducted.
         */
        const voucherResult =
          await this.rewardsService
            .awardRandomVoucher();


        if (
          !voucherResult.success ||
          !voucherResult.voucher
        ) {

          this.rewardAmountDisplay =
            '0';


          this.rewardMessage =
            'Unable to add the voucher to your rewards.';


          break;
        }


        const wonVoucher =
          voucherResult.voucher;


        /*
         * Find original voucher option
         * so we can also show its emoji.
         */
        const catalogVoucher =
          this.rewardsService
            .getVoucherCatalog()
            .find(
              (voucher) =>
                voucher.id ===
                wonVoucher.voucherId
            );


        /*
         * Change the generic
         * "Voucher" scratch prize into
         * the ACTUAL voucher won.
         *
         * This also means Recent Rewards
         * will show the real voucher.
         */
        reward.label =
          wonVoucher.title;


        reward.value =
          wonVoucher.voucherId;


        reward.emoji =
          catalogVoucher?.emoji ??
          '🎟️';


        this.rewardAmountDisplay =
          '1 Voucher';


        this.rewardMessage =
          `${wonVoucher.title} was added to ` +
          'your Discounts & Vouchers wallet.';


        break;
      }

    }
  }


  /*
   * =====================================
   * CHECK AVAILABILITY
   * =====================================
   */

  private checkAvailability(): void {

    try {

      const storedValue =
        localStorage.getItem(
          this.getLastRevealStorageKey()
        );


      if (!storedValue) {

        this.availableNow =
          true;


        return;
      }


      const lastRevealAt =
        Number(
          storedValue
        );


      if (
        !Number.isFinite(
          lastRevealAt
        )
      ) {

        this.availableNow =
          true;


        return;
      }


      const elapsedTime =
        Date.now() -
        lastRevealAt;


      this.availableNow =
        elapsedTime >=
        this.SCRATCH_INTERVAL_MS;

    } catch (error) {

      console.warn(
        'Unable to check scratch-card availability:',
        error
      );


      this.availableNow =
        true;
    }
  }


  /*
   * =====================================
   * AUTO REFRESH AVAILABILITY
   * =====================================
   */

  private refreshAvailability(): void {

    /*
     * Do not generate another card
     * while showing a prize that
     * has just been revealed.
     */
    if (this.revealed) {

      return;
    }


    const wasAvailable =
      this.availableNow;


    this.checkAvailability();


    /*
     * 30-second cooldown
     * has just finished.
     */
    if (
      !wasAvailable &&
      this.availableNow
    ) {

      this.prepareReward();


      setTimeout(
        () => {

          this.setupScratchCard();

        },
        100
      );
    }
  }


  /*
   * =====================================
   * RECENT SCRATCH REWARD HISTORY
   * =====================================
   */

  private loadRewardHistory(): void {

    try {

      const storedValue =
        localStorage.getItem(
          this.getRewardHistoryStorageKey()
        );


      if (!storedValue) {

        this.recentRewards =
          [];


        return;
      }


      const parsedValue:
        unknown =
        JSON.parse(
          storedValue
        );


      if (
        !Array.isArray(
          parsedValue
        )
      ) {

        this.recentRewards =
          [];


        return;
      }


      this.recentRewards =
        parsedValue
          .filter(
            (
              reward
            ): reward is RewardHistoryItem => {

              if (
                !reward ||
                typeof reward !==
                  'object'
              ) {

                return false;
              }


              const item =
                reward as
                  Partial<RewardHistoryItem>;


              return (

                typeof item.label ===
                  'string'

                &&

                typeof item.value ===
                  'string'

                &&

                typeof item.emoji ===
                  'string'

                &&

                (
                  item.type ===
                    'coins'

                  ||

                  item.type ===
                    'cashback'

                  ||

                  item.type ===
                    'voucher'
                )

                &&

                typeof item.amount ===
                  'number'

                &&

                typeof item.status ===
                  'string'

                &&

                typeof item.wonAt ===
                  'number'

              );
            }
          )
          .slice(
            0,
            5
          );

    } catch (error) {

      console.warn(
        'Unable to load reward history:',
        error
      );


      this.recentRewards =
        [];
    }
  }


  private saveRewardHistory(): void {

    try {

      localStorage.setItem(
        this.getRewardHistoryStorageKey(),

        JSON.stringify(
          this.recentRewards
        )
      );

    } catch (error) {

      console.warn(
        'Unable to save reward history:',
        error
      );
    }
  }


  /*
   * =====================================
   * CASHBACK
   * =====================================
   */

  private getCashbackBalance(): number {

    const storedValue =
      localStorage.getItem(
        this.getCashbackStorageKey()
      );


    const balance =
      Number(
        storedValue
      );


    return (
      Number.isFinite(
        balance
      )
        ? balance
        : 0
    );
  }


  /*
   * =====================================
   * CURRENT USER
   * =====================================
   */

  private getCurrentUsername(): string {

    const currentUser =
      this.authService
        .getCurrentUser();


    return (
      currentUser
        ?.username
        .trim()
        .toLowerCase()
      ??
      'guest'
    );
  }


  /*
   * =====================================
   * STORAGE KEYS
   * =====================================
   */

  private getLastRevealStorageKey():
    string {

    return (
      `scratchLastReveal_` +
      this.getCurrentUsername()
    );
  }


  private getRewardHistoryStorageKey():
    string {

    return (
      `scratchRewardHistory_` +
      this.getCurrentUsername()
    );
  }


  private getCashbackStorageKey():
    string {

    return (
      `cashbackBalance_` +
      this.getCurrentUsername()
    );
  }


  /*
   * NOTICE:
   *
   * There is intentionally NO
   * voucherCount_ storage here anymore.
   *
   * Vouchers are now stored properly
   * through RewardsService as:
   *
   * userVouchers_username
   */


  /*
   * =====================================
   * DRAW ROUNDED RECTANGLE
   * =====================================
   */

  private drawRoundedRectangle(
    context:
      CanvasRenderingContext2D,

    x:
      number,

    y:
      number,

    width:
      number,

    height:
      number,

    radius:
      number
  ): void {

    const safeRadius =
      Math.min(
        radius,
        width / 2,
        height / 2
      );


    context.beginPath();


    context.moveTo(
      x + safeRadius,
      y
    );


    context.lineTo(
      x + width -
      safeRadius,
      y
    );


    context.quadraticCurveTo(
      x + width,
      y,
      x + width,
      y + safeRadius
    );


    context.lineTo(
      x + width,
      y + height -
      safeRadius
    );


    context.quadraticCurveTo(
      x + width,
      y + height,
      x + width -
      safeRadius,
      y + height
    );


    context.lineTo(
      x + safeRadius,
      y + height
    );


    context.quadraticCurveTo(
      x,
      y + height,
      x,
      y + height -
      safeRadius
    );


    context.lineTo(
      x,
      y + safeRadius
    );


    context.quadraticCurveTo(
      x,
      y,
      x + safeRadius,
      y
    );


    context.closePath();
  }


  /*
   * =====================================
   * CLOSE
   * =====================================
   */

  cancel(): void {

    this.close.emit();
  }


  done(): void {

    this.close.emit();
  }
}