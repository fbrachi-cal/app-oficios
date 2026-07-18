import { logger } from "../utils/logger";
import { Capacitor } from "@capacitor/core";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithCredential, 
  signOut as firebaseSignOut,
  UserCredential 
} from "firebase/auth";
import { auth } from "../firebase";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

/**
 * Handles Google Sign-In across web and native mobile wrappers.
 * Uses native Capawesome plugin on Android/iOS, falling back to web popup.
 */
export const iniciarSesionConGoogle = async (): Promise<UserCredential> => {
  if (Capacitor.isNativePlatform()) {
    logger.info("Initializing native Google Sign-In flow");
    
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) {
      throw new Error("Missing Google Sign-In ID Token from native layer.");
    }
    
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    
    logger.info("Native Google Sign-In and JS SDK linking successful");
    return userCredential;
  } else {
    logger.info("Initializing web Google Sign-In flow");
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  }
};

/**
 * Cleanly signs out from both the Firebase JS SDK and native Capawesome plugins.
 * This clears Google Sign-In caches to force the account selector sheet on next login.
 */
export const cerrarSesion = async (): Promise<void> => {
  logger.info("Executing global sign out");
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut();
      logger.info("Native FirebaseAuthentication plugin sign out successful");
    } catch (err) {
      logger.error("Error signing out from native Capawesome plugin", err);
    }
  }
  await firebaseSignOut(auth);
  logger.info("Firebase JS SDK sign out successful");
};
