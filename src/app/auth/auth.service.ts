import { Injectable } from '@angular/core';
import {
  Auth,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where
} from '@angular/fire/firestore';

export interface User {
  id?: string;
  username: string;
  password: string;
  countryCode?: string;
  phoneNumber?: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  countryCode?: string;
  phoneNumber?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly emailDomain = 'hoops.app';
  private readonly usernamesCollection = 'usernames';
  private readonly profilesCollection = 'userProfiles';

  private currentUser: CurrentUser | null = null;

  /** Resolves once the initial Firebase Auth session (if any) has been rehydrated. */
  readonly authReady: Promise<void>;

  constructor(private auth: Auth, private firestore: Firestore) {
    this.authReady = new Promise((resolve) => {
      let settled = false;
      onAuthStateChanged(this.auth, async (firebaseUser) => {
        await this.syncCurrentUser(firebaseUser);
        if (!settled) {
          settled = true;
          resolve();
        }
      });
    });
  }

  async login(username: string, password: string): Promise<{ success: boolean; message?: string; user?: CurrentUser }> {
    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername || !password) {
      return { success: false, message: 'Incorrect username or password' };
    }

    try {
      const credential = await signInWithEmailAndPassword(this.auth, this.toEmail(normalizedUsername), password);
      await this.syncCurrentUser(credential.user);
      return { success: true, user: this.currentUser ?? undefined };
    } catch {
      return { success: false, message: 'Incorrect username or password' };
    }
  }

  async register(user: User): Promise<{ success: boolean; message?: string }> {
    const normalizedUsername = this.normalizeUsername(user.username);
    if (!normalizedUsername) {
      return { success: false, message: 'Username is required' };
    }

    try {
      const credential = await createUserWithEmailAndPassword(this.auth, this.toEmail(normalizedUsername), user.password);
      const cleanUsername = user.username.trim();

      await updateProfile(credential.user, { displayName: cleanUsername });

      await setDoc(doc(this.firestore, this.usernamesCollection, normalizedUsername), {
        uid: credential.user.uid,
        username: cleanUsername
      });

      await setDoc(doc(this.firestore, this.profilesCollection, credential.user.uid), {
        countryCode: user.countryCode || '',
        phoneNumber: user.phoneNumber || ''
      });

      await this.syncCurrentUser(credential.user);
      return { success: true };
    } catch (error) {
      const code = this.firebaseErrorCode(error);
      if (code === 'auth/email-already-in-use') {
        return { success: false, message: 'Username already exists' };
      }
      if (code === 'auth/operation-not-allowed') {
        return { success: false, message: 'Sign-up is temporarily unavailable. Please try again later.' };
      }
      if (code === 'auth/weak-password') {
        return { success: false, message: 'Password is too weak. Use at least 6 characters.' };
      }
      return { success: false, message: 'Unable to create account. Please try again.' };
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getCurrentUser(): CurrentUser | null {
    return this.currentUser;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUser = null;
  }

  async getAccountDisplayName(username: string): Promise<string> {
    return (await this.getAccountUsername(username)) ?? username;
  }

  async getAccountId(username: string): Promise<string | null> {
    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername) {
      return null;
    }

    const snapshot = await getDoc(doc(this.firestore, this.usernamesCollection, normalizedUsername));
    if (!snapshot.exists()) {
      return null;
    }
    return (snapshot.data()['uid'] as string) || null;
  }

  async getUsernameById(id: string): Promise<string | null> {
    if (!id) {
      return null;
    }

    const lookupQuery = query(collection(this.firestore, this.usernamesCollection), where('uid', '==', id));
    const snapshot = await getDocs(lookupQuery);
    if (snapshot.empty) {
      return null;
    }
    return (snapshot.docs[0].data()['username'] as string) || null;
  }

  async accountExists(username: string): Promise<boolean> {
    return (await this.getAccountUsername(username)) !== null;
  }

  async getAccountUsername(username: string): Promise<string | null> {
    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername) {
      return null;
    }

    const snapshot = await getDoc(doc(this.firestore, this.usernamesCollection, normalizedUsername));
    if (!snapshot.exists()) {
      return null;
    }
    return (snapshot.data()['username'] as string) || null;
  }

  private async syncCurrentUser(firebaseUser: FirebaseUser | null): Promise<void> {
    if (!firebaseUser) {
      this.currentUser = null;
      return;
    }

    let countryCode: string | undefined;
    let phoneNumber: string | undefined;

    try {
      const profileSnapshot = await getDoc(doc(this.firestore, this.profilesCollection, firebaseUser.uid));
      if (profileSnapshot.exists()) {
        const data = profileSnapshot.data();
        countryCode = (data['countryCode'] as string) || undefined;
        phoneNumber = (data['phoneNumber'] as string) || undefined;
      }
    } catch (error) {
      console.warn('Unable to load user profile:', error);
    }

    this.currentUser = {
      id: firebaseUser.uid,
      username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user',
      countryCode,
      phoneNumber
    };
  }

  private toEmail(normalizedUsername: string): string {
    return `${normalizedUsername}@${this.emailDomain}`;
  }

  private normalizeUsername(username: string): string {
    return (username || '').trim().toLowerCase();
  }

  private firebaseErrorCode(error: unknown): string | null {
    if (error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
      return (error as { code: string }).code;
    }
    return null;
  }
}
