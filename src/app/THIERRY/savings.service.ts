import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string;
}

export interface FinanceData {
  balance: number;
  goals: SavingsGoal[];
}

export interface SavingsResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class SavingsService {
  constructor(private authService: AuthService) {}

  getFinanceData(): FinanceData {
    const storageKey = this.getStorageKey();

    try {
      const savedData = localStorage.getItem(storageKey);

      if (!savedData) {
        const defaultData = this.createDefaultFinanceData();
        this.saveFinanceData(defaultData);
        return defaultData;
      }

      const parsedData: unknown = JSON.parse(savedData);

      if (!this.isFinanceData(parsedData)) {
        const defaultData = this.createDefaultFinanceData();
        this.saveFinanceData(defaultData);
        return defaultData;
      }

      return parsedData;
    } catch (error) {
      console.error('Unable to load finance data:', error);

      const defaultData = this.createDefaultFinanceData();
      this.saveFinanceData(defaultData);

      return defaultData;
    }
  }

  createGoal(
    name: string,
    targetAmount: number
  ): SavingsResult {
    const cleanedName = name.trim();

    if (!cleanedName) {
      return {
        success: false,
        message: 'Goal name is required.',
      };
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return {
        success: false,
        message: 'Enter a valid target amount.',
      };
    }

    const financeData = this.getFinanceData();

    const duplicateGoal = financeData.goals.some(
      (goal) =>
        goal.name.toLowerCase() === cleanedName.toLowerCase()
    );

    if (duplicateGoal) {
      return {
        success: false,
        message: 'A savings goal with this name already exists.',
      };
    }

    const availableColors = [
      'success',
      'warning',
      'tertiary',
      'primary',
      'secondary',
    ];

    const newGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      name: cleanedName,
      targetAmount: this.roundMoney(targetAmount),
      savedAmount: 0,
      color:
        availableColors[
          financeData.goals.length % availableColors.length
        ],
    };

    financeData.goals.push(newGoal);
    this.saveFinanceData(financeData);

    return {
      success: true,
      message: 'Savings goal created successfully.',
    };
  }

  updateGoal(
    goalId: string,
    name: string,
    targetAmount: number
  ): SavingsResult {
    const cleanedName = name.trim();
    const financeData = this.getFinanceData();

    const goal = financeData.goals.find(
      (currentGoal) => currentGoal.id === goalId
    );

    if (!goal) {
      return {
        success: false,
        message: 'Savings goal was not found.',
      };
    }

    if (!cleanedName) {
      return {
        success: false,
        message: 'Goal name is required.',
      };
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return {
        success: false,
        message: 'Enter a valid target amount.',
      };
    }

    if (targetAmount < goal.savedAmount) {
      return {
        success: false,
        message:
          'The target cannot be lower than the amount already saved.',
      };
    }

    const duplicateGoal = financeData.goals.some(
      (currentGoal) =>
        currentGoal.id !== goalId &&
        currentGoal.name.toLowerCase() ===
          cleanedName.toLowerCase()
    );

    if (duplicateGoal) {
      return {
        success: false,
        message: 'A savings goal with this name already exists.',
      };
    }

    goal.name = cleanedName;
    goal.targetAmount = this.roundMoney(targetAmount);

    this.saveFinanceData(financeData);

    return {
      success: true,
      message: 'Savings goal updated successfully.',
    };
  }

  depositToGoal(
    goalId: string,
    amount: number
  ): SavingsResult {
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        message: 'Enter an amount greater than $0.',
      };
    }

    const financeData = this.getFinanceData();

    const goal = financeData.goals.find(
      (currentGoal) => currentGoal.id === goalId
    );

    if (!goal) {
      return {
        success: false,
        message: 'Savings goal was not found.',
      };
    }

    if (amount > financeData.balance) {
      return {
        success: false,
        message: 'You do not have enough available balance.',
      };
    }

    const amountRemaining =
      goal.targetAmount - goal.savedAmount;

    if (amountRemaining <= 0) {
      return {
        success: false,
        message: 'This savings goal is already completed.',
      };
    }

    if (amount > amountRemaining) {
      return {
        success: false,
        message:
          `You can only add up to $${amountRemaining.toFixed(2)} ` +
          'to this goal.',
      };
    }

    financeData.balance = this.roundMoney(
      financeData.balance - amount
    );

    goal.savedAmount = this.roundMoney(
      goal.savedAmount + amount
    );

    this.saveFinanceData(financeData);

    return {
      success: true,
      message:
        `$${amount.toFixed(2)} was added to ${goal.name}.`,
    };
  }

  deleteGoal(goalId: string): SavingsResult {
    const financeData = this.getFinanceData();

    const goalIndex = financeData.goals.findIndex(
      (goal) => goal.id === goalId
    );

    if (goalIndex === -1) {
      return {
        success: false,
        message: 'Savings goal was not found.',
      };
    }

    const deletedGoal = financeData.goals[goalIndex];

    financeData.balance = this.roundMoney(
      financeData.balance + deletedGoal.savedAmount
    );

    financeData.goals.splice(goalIndex, 1);

    this.saveFinanceData(financeData);

    return {
      success: true,
      message:
        `${deletedGoal.name} was deleted. ` +
        'Its saved money was returned to your balance.',
    };
  }

  getTotalSaved(financeData?: FinanceData): number {
    const data = financeData ?? this.getFinanceData();

    const total = data.goals.reduce(
      (currentTotal, goal) =>
        currentTotal + goal.savedAmount,
      0
    );

    return this.roundMoney(total);
  }

  private saveFinanceData(financeData: FinanceData): void {
    try {
      localStorage.setItem(
        this.getStorageKey(),
        JSON.stringify(financeData)
      );
    } catch (error) {
      console.error('Unable to save finance data:', error);
    }
  }

  private getStorageKey(): string {
    const currentUser = this.authService.getCurrentUser();

    const username =
      currentUser?.username.trim().toLowerCase() ?? 'guest';

    return `financeData_${username}`;
  }

  private createDefaultFinanceData(): FinanceData {
    return {
      balance: 900000,
      goals: [
        {
          id: 'emergency-fund',
          name: 'Emergency Fund',
          targetAmount: 2000,
          savedAmount: 500,
          color: 'success',
        },
        {
          id: 'vacation',
          name: 'Vacation',
          targetAmount: 2000,
          savedAmount: 500,
          color: 'warning',
        },
        {
          id: 'new-laptop',
          name: 'New Laptop',
          targetAmount: 2000,
          savedAmount: 500,
          color: 'tertiary',
        },
      ],
    };
  }

  private roundMoney(amount: number): number {
    return Math.round(
      (amount + Number.EPSILON) * 100
    ) / 100;
  }

  private isFinanceData(value: unknown): value is FinanceData {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const financeData = value as Partial<FinanceData>;

    if (
      typeof financeData.balance !== 'number' ||
      !Array.isArray(financeData.goals)
    ) {
      return false;
    }

    return financeData.goals.every((goal) => {
      return Boolean(
        goal &&
        typeof goal.id === 'string' &&
        typeof goal.name === 'string' &&
        typeof goal.targetAmount === 'number' &&
        typeof goal.savedAmount === 'number' &&
        typeof goal.color === 'string'
      );
    });
  }
}