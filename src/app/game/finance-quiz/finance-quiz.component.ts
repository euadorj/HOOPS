import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

import { AuthService } from '../../auth/auth.service';
import { CoinService } from '../coin.service';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

@Component({
  selector: 'app-finance-quiz',
  templateUrl: './finance-quiz.component.html',
  styleUrls: ['./finance-quiz.component.scss'],
  standalone: false,
})
export class FinanceQuizComponent
  implements OnInit, OnDestroy
{
  @Output() close = new EventEmitter<void>();
  @Output() rewardClaimed =
    new EventEmitter<void>();

  private readonly QUIZ_COOLDOWN_MS =
    30 * 1000;

  questions: QuizQuestion[] = [
    {
      question:
        'What is the main purpose of an emergency fund?',
      options: [
        'To buy luxury items',
        'To cover unexpected expenses',
        'To increase monthly spending',
        'To avoid creating a budget',
      ],
      correctAnswer: 1,
    },
    {
      question:
        'Which action normally helps savings grow?',
      options: [
        'Saving regularly',
        'Spending all available income',
        'Ignoring expenses',
        'Borrowing for every purchase',
      ],
      correctAnswer: 0,
    },
    {
      question:
        'What does a budget help you track?',
      options: [
        'Only your salary',
        'Only your savings',
        'Income and expenses',
        'Only investment profits',
      ],
      correctAnswer: 2,
    },
    {
      question:
        'Which is generally a need rather than a want?',
      options: [
        'Designer shoes',
        'Concert tickets',
        'Basic groceries',
        'A new gaming skin',
      ],
      correctAnswer: 2,
    },
    {
      question:
        'What does diversification mean?',
      options: [
        'Putting all money into one investment',
        'Spreading money across different investments',
        'Avoiding savings completely',
        'Spending investment returns immediately',
      ],
      correctAnswer: 1,
    },
  ];

  quizStarted = false;
  finished = false;

  currentQuestionIndex = 0;
  selectedAnswer: number | null = null;

  score = 0;
  earnedCoins = 0;

  canPlay = true;
  countdownText = 'Ready';

  private countdownTimer?: number;

  constructor(
    private authService: AuthService,
    private coinService: CoinService
  ) {}

  ngOnInit(): void {
    this.updateAvailability();

    this.countdownTimer = window.setInterval(() => {
      this.updateAvailability();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownTimer !== undefined) {
      window.clearInterval(this.countdownTimer);
    }
  }

  get currentQuestion(): QuizQuestion {
    return this.questions[
      this.currentQuestionIndex
    ];
  }

  get progressValue(): number {
    return (
      (this.currentQuestionIndex + 1) /
      this.questions.length
    );
  }

  startQuiz(): void {
    this.updateAvailability();

    if (!this.canPlay) {
      return;
    }

    this.quizStarted = true;
    this.finished = false;
    this.currentQuestionIndex = 0;
    this.selectedAnswer = null;
    this.score = 0;
    this.earnedCoins = 0;
  }

  chooseAnswer(index: number): void {
    this.selectedAnswer = index;
  }

  nextQuestion(): void {
    if (this.selectedAnswer === null) {
      return;
    }

    const wasCorrect =
      this.selectedAnswer ===
      this.currentQuestion.correctAnswer;

    const updatedScore =
      this.score + (wasCorrect ? 1 : 0);

    this.score = updatedScore;

    if (
      this.currentQuestionIndex ===
      this.questions.length - 1
    ) {
      this.finishQuiz(updatedScore);
      return;
    }

    this.currentQuestionIndex++;
    this.selectedAnswer = null;
  }

  closeGame(): void {
    this.close.emit();
  }

  private finishQuiz(finalScore: number): void {
    this.finished = true;
    this.quizStarted = false;

    const correctAnswerReward =
      finalScore * 20;

    const perfectScoreBonus =
      finalScore === this.questions.length
        ? 50
        : 0;

    this.earnedCoins =
      correctAnswerReward + perfectScoreBonus;

    this.coinService.addCoins(this.earnedCoins);

    localStorage.setItem(
      this.getLastQuizStorageKey(),
      String(Date.now())
    );

    this.rewardClaimed.emit();
    this.updateAvailability();
  }

  private updateAvailability(): void {
    const storedValue = localStorage.getItem(
      this.getLastQuizStorageKey()
    );

    if (!storedValue) {
      this.canPlay = true;
      this.countdownText = 'Ready';
      return;
    }

    const lastQuizAt = Number(storedValue);

    if (!Number.isFinite(lastQuizAt)) {
      this.canPlay = true;
      this.countdownText = 'Ready';
      return;
    }

    const remaining =
      this.QUIZ_COOLDOWN_MS -
      (Date.now() - lastQuizAt);

    if (remaining <= 0) {
      this.canPlay = true;
      this.countdownText = 'Ready';
      return;
    }

    this.canPlay = false;
    this.countdownText =
      this.formatCountdown(remaining);
  }

  private formatCountdown(milliseconds: number): string {
    const totalSeconds = Math.max(
      0,
      Math.ceil(milliseconds / 1000)
    );

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return (
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}`
    );
  }

  private getLastQuizStorageKey(): string {
    return `lastFinanceQuiz_${this.getUsername()}`;
  }

  private getUsername(): string {
    return (
      this.authService
        .getCurrentUser()
        ?.username.trim()
        .toLowerCase() ?? 'guest'
    );
  }
}