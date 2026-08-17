import { Injectable } from '@angular/core';

import {
  Auth,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from '@angular/fire/auth';

import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
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

  private readonly financeCollection = 'financeAccounts';

  private readonly dashboardCollection = 'dashboards';


  private currentUser: CurrentUser | null = null;


  readonly authReady: Promise<void>;


  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {

    this.authReady = new Promise<void>((resolve) => {

      let initialAuthResolved = false;


      onAuthStateChanged(
        this.auth,
        async (firebaseUser) => {

          await this.syncCurrentUser(firebaseUser);


          if (!initialAuthResolved) {

            initialAuthResolved = true;

            resolve();
          }
        }
      );
    });
  }


  /*
   * =====================================
   * LOGIN
   * =====================================
   */

  async login(
    username: string,
    password: string
  ): Promise<{
    success: boolean;
    message?: string;
    user?: CurrentUser;
  }> {

    const normalizedUsername =
      this.normalizeUsername(username);


    if (!normalizedUsername || !password) {

      return {
        success: false,
        message: 'Incorrect username or password',
      };
    }


    try {

      const credential =
        await signInWithEmailAndPassword(
          this.auth,
          this.toEmail(normalizedUsername),
          password
        );


      await this.syncCurrentUser(
        credential.user
      );


      return {
        success: true,
        user: this.currentUser ?? undefined,
      };

    } catch (error) {

      console.warn(
        'Login failed:',
        error
      );


      return {
        success: false,
        message: 'Incorrect username or password',
      };
    }
  }


  /*
   * =====================================
   * REGISTER
   * =====================================
   */

  async register(
    user: User
  ): Promise<{
    success: boolean;
    message?: string;
  }> {

    const normalizedUsername =
      this.normalizeUsername(
        user.username
      );


    if (!normalizedUsername) {

      return {
        success: false,
        message: 'Username is required',
      };
    }


    try {

      /*
       * Firebase Authentication account.
       */
      const credential =
        await createUserWithEmailAndPassword(
          this.auth,
          this.toEmail(normalizedUsername),
          user.password
        );


      const cleanUsername =
        user.username.trim();


      await updateProfile(
        credential.user,
        {
          displayName: cleanUsername,
        }
      );


      /*
       * =================================
       * USERNAME LOOKUP
       * =================================
       */

      await setDoc(
        doc(
          this.firestore,
          this.usernamesCollection,
          normalizedUsername
        ),
        {
          uid: credential.user.uid,
          username: cleanUsername,
        }
      );


      /*
       * =================================
       * PROFILE
       * =================================
       */

      await setDoc(
        doc(
          this.firestore,
          this.profilesCollection,
          credential.user.uid
        ),
        {
          countryCode: user.countryCode || '',
          phoneNumber: user.phoneNumber || '',
        }
      );


      /*
       * =================================
       * FINANCE ACCOUNT
       * =================================
       *
       * NEW USERS START AT ZERO.
       */

      await setDoc(
        doc(
          this.firestore,
          this.financeCollection,
          normalizedUsername
        ),
        {
          balance: 0,
          goals: [],
        }
      );


      /*
       * =================================
       * DASHBOARD
       * =================================
       *
       * NO Apple
       * NO NVIDIA
       * NO Tesla
       * NO fake bills
       * NO fake budget
       */

      await setDoc(
        doc(
          this.firestore,
          this.dashboardCollection,
          normalizedUsername
        ),
        {
          selectedItems: [
            'savings-goals',
            'investment-tracking',
          ],

          investments: [],

          monthlyBudget: 0,

          upcomingBills: [],
        }
      );


      /*
       * User is sent to Sign In after
       * registration, so log out the
       * Firebase account created above.
       */
      await signOut(
        this.auth
      );


      this.currentUser = null;


      return {
        success: true,
      };

    } catch (error) {

      console.error(
        'Registration error:',
        error
      );


      const code =
        this.firebaseErrorCode(
          error
        );


      if (
        code ===
        'auth/email-already-in-use'
      ) {

        return {
          success: false,
          message: 'Username already exists',
        };
      }


      if (
        code ===
        'auth/operation-not-allowed'
      ) {

        return {
          success: false,
          message:
            'Sign-up is temporarily unavailable. Please try again later.',
        };
      }


      if (
        code ===
        'auth/weak-password'
      ) {

        return {
          success: false,
          message:
            'Password is too weak. Use at least 6 characters.',
        };
      }


      return {
        success: false,
        message:
          'Unable to create account. Please try again.',
      };
    }
  }


  /*
   * =====================================
   * AUTH STATUS
   * =====================================
   */

  isAuthenticated(): boolean {

    return this.currentUser !== null;
  }


  getCurrentUser(): CurrentUser | null {

    return this.currentUser;
  }


  /*
   * =====================================
   * LOGOUT
   * =====================================
   */

  async logout(): Promise<void> {

    await signOut(
      this.auth
    );


    this.currentUser = null;
  }


  /*
   * =====================================
   * ACCOUNT DISPLAY NAME
   * =====================================
   */

  async getAccountDisplayName(
    username: string
  ): Promise<string> {

    const result =
      await this.getAccountUsername(
        username
      );


    return result ?? username;
  }


  /*
   * =====================================
   * GET ACCOUNT UID
   * =====================================
   */

  async getAccountId(
    username: string
  ): Promise<string | null> {

    const normalizedUsername =
      this.normalizeUsername(
        username
      );


    if (!normalizedUsername) {

      return null;
    }


    const snapshot =
      await getDoc(
        doc(
          this.firestore,
          this.usernamesCollection,
          normalizedUsername
        )
      );


    if (!snapshot.exists()) {

      return null;
    }


    const data =
      snapshot.data();


    const uid =
      data['uid'];


    return typeof uid === 'string'
      ? uid
      : null;
  }


  /*
   * =====================================
   * GET USERNAME FROM UID
   * =====================================
   */

  async getUsernameById(
    id: string
  ): Promise<string | null> {

    if (!id) {

      return null;
    }


    const lookupQuery =
      query(
        collection(
          this.firestore,
          this.usernamesCollection
        ),

        where(
          'uid',
          '==',
          id
        )
      );


    const snapshot =
      await getDocs(
        lookupQuery
      );


    if (snapshot.empty) {

      return null;
    }


    const data =
      snapshot.docs[0]
        .data();


    const username =
      data['username'];


    return typeof username === 'string'
      ? username
      : null;
  }


  /*
   * =====================================
   * ACCOUNT EXISTS
   * =====================================
   */

  async accountExists(
    username: string
  ): Promise<boolean> {

    const existingUsername =
      await this.getAccountUsername(
        username
      );


    return existingUsername !== null;
  }


  /*
   * =====================================
   * USERNAME LOOKUP
   * =====================================
   */

  async getAccountUsername(
    username: string
  ): Promise<string | null> {

    const normalizedUsername =
      this.normalizeUsername(
        username
      );


    if (!normalizedUsername) {

      return null;
    }


    const snapshot =
      await getDoc(
        doc(
          this.firestore,
          this.usernamesCollection,
          normalizedUsername
        )
      );


    if (!snapshot.exists()) {

      return null;
    }


    const data =
      snapshot.data();


    const storedUsername =
      data['username'];


    return typeof storedUsername === 'string'
      ? storedUsername
      : null;
  }


  /*
   * =====================================
   * SYNC CURRENT FIREBASE USER
   * =====================================
   */

  private async syncCurrentUser(
    firebaseUser: FirebaseUser | null
  ): Promise<void> {

    if (!firebaseUser) {

      this.currentUser = null;

      return;
    }


    let countryCode:
      string | undefined;


    let phoneNumber:
      string | undefined;


    try {

      const profileSnapshot =
        await getDoc(
          doc(
            this.firestore,
            this.profilesCollection,
            firebaseUser.uid
          )
        );


      if (
        profileSnapshot.exists()
      ) {

        const data =
          profileSnapshot.data();


        const storedCountryCode =
          data['countryCode'];


        const storedPhoneNumber =
          data['phoneNumber'];


        countryCode =
          typeof storedCountryCode === 'string' &&
          storedCountryCode
            ? storedCountryCode
            : undefined;


        phoneNumber =
          typeof storedPhoneNumber === 'string' &&
          storedPhoneNumber
            ? storedPhoneNumber
            : undefined;
      }

    } catch (error) {

      console.warn(
        'Unable to load user profile:',
        error
      );
    }


    const username =
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      'user';


    this.currentUser = {

      id: firebaseUser.uid,

      username,

      countryCode,

      phoneNumber,
    };
  }


  /*
   * =====================================
   * EMAIL
   * =====================================
   */

  private toEmail(
    normalizedUsername: string
  ): string {

    return (
      `${normalizedUsername}` +
      `@${this.emailDomain}`
    );
  }


  /*
   * =====================================
   * NORMALIZE USERNAME
   * =====================================
   */

  private normalizeUsername(
    username: string
  ): string {

    return (
      username || ''
    )
      .trim()
      .toLowerCase();
  }


  /*
   * =====================================
   * FIREBASE ERROR CODE
   * =====================================
   */

  private firebaseErrorCode(
    error: unknown
  ): string | null {

    if (
      error &&
      typeof error === 'object' &&
      'code' in error
    ) {

      const code =
        (error as { code?: unknown }).code;


      return typeof code === 'string'
        ? code
        : null;
    }


    return null;
  }
}