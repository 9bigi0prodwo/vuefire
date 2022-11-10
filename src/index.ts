import type { FirebaseApp } from 'firebase/app'
import type { App } from 'vue'
import { _FirebaseAppInjectionKey } from './app'

// Database
export { useList, useObject, useDatabase } from './database'
export type {
  UseListOptions,
  UseObjectOptions,
  UseDatabaseRefOptions,
} from './database'
export type {
  DatabaseSnapshotSerializer,
  _RefDatabase,
  VueDatabaseDocumentData,
  VueDatabaseQueryData,
} from './database/utils'

// Firestore
export { useCollection, useDocument, useFirestore } from './firestore'
export { firestoreDefaultConverter } from './firestore/utils'
export type {
  UseCollectionOptions,
  UseDocumentOptions,
  _RefFirestore,
  VueFirestoreDocumentData,
  VueFirestoreQueryData,
} from './firestore'

// Database options API
export { databasePlugin } from './database/optionsApi'
export type {
  DatabasePluginOptions,
  VueFirebaseObject,
  FirebaseOption,
} from './database/optionsApi'

// Firestore options API
export { firestorePlugin } from './firestore/optionsApi'
export type {
  FirestorePluginOptions,
  VueFirestoreObject,
  FirestoreOption,
} from './firestore/optionsApi'

// app
export { useFirebaseApp } from './app'

// Auth
export { useCurrentUser, VueFireAuth, useFirebaseAuth } from './auth'

// SSR
export { usePendingPromises } from './ssr/plugin'

// App Check
export { VueFireAppCheck, useAppCheckToken } from './app-check'

/**
 * Options for VueFire Vue plugin.
 */
export interface VueFireOptions {
  firebaseApp: FirebaseApp

  /**
   * Array of VueFire modules that should be added to the application. e.g. `[VueFireAuth, VueFireDatabase]`. Remember
   * to import them from `vuefire`.
   */
  modules?: Array<(firebaseApp: FirebaseApp | undefined, app: App) => void>
}

/**
 * Still under development.
 *
 * @experimental
 */
export function VueFire(
  app: App,
  { firebaseApp, modules: services = [] }: VueFireOptions
) {
  app.provide(_FirebaseAppInjectionKey, firebaseApp)

  for (const firebaseModule of services) {
    app.use(firebaseModule.bind(null, firebaseApp))
  }
}
