import { initializeApp } from 'firebase/app'
import {
  connectDatabaseEmulator,
  getDatabase,
  ref,
  query as databaseQuery,
  orderByChild,
  remove,
} from 'firebase/database'
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  query as firestoreQuery,
  orderBy,
  CollectionReference,
  getDocsFromServer,
  QueryDocumentSnapshot,
  deleteDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll } from 'vitest'
import { isCollectionRef, isDocumentRef } from '../src/shared'

export const firebaseApp = initializeApp({ projectId: 'vue-fire-store' })
export const firestore = getFirestore(firebaseApp)
export const database = getDatabase(firebaseApp)

connectFirestoreEmulator(firestore, 'localhost', 8080)
connectDatabaseEmulator(database, 'localhost', 8081)

let _id = 0

// Firestore
export function setupFirestoreRefs() {
  const testId = _id++
  const testsCollection = collection(firestore, `__tests`)
  const itemRef = doc(testsCollection, `item:${testId}`)
  const forItemsRef = doc(testsCollection, `forItems:${testId}`)

  const listRef = collection(forItemsRef, 'list')
  const orderedListRef = firestoreQuery(listRef, orderBy('name'))

  beforeAll(async () => {
    // clean up the tests data
    await Promise.all([
      deleteDoc(itemRef),
      clearCollection(listRef),
      clearCollection(testsCollection),
    ])
  })

  return { itemRef, listRef, orderedListRef, testId, col: forItemsRef }
}

async function clearCollection(collection: CollectionReference) {
  const { docs } = await getDocsFromServer(collection)
  await Promise.all(
    docs.map((doc) => {
      return recursiveDeleteDoc(doc)
    })
  )
}

async function recursiveDeleteDoc(doc: QueryDocumentSnapshot) {
  const docData = doc.data()
  const promises: Promise<any>[] = []
  if (docData) {
    for (const key in docData) {
      if (isCollectionRef(docData[key])) {
        promises.push(clearCollection(docData[key]))
      } else if (isDocumentRef(docData[key])) {
        promises.push(recursiveDeleteDoc(docData[key]))
      }
    }
  }
  promises.push(deleteDoc(doc.ref))
  return Promise.all(promises)
}

// Database
export function setupDatabaseRefs() {
  const testId = _id++
  const testsCollection = ref(database, `__tests_${testId}`)

  const itemRef = ref(database, testsCollection.key + `/item`)
  const listRef = ref(database, testsCollection.key + `/items`)
  const orderedListRef = databaseQuery(listRef, orderByChild('name'))

  beforeAll(async () => {
    // clean up the tests data
    await remove(testsCollection)
  })

  function databaseRef(path: string) {
    return ref(database, testsCollection.key + '/' + path)
  }

  return { itemRef, listRef, orderedListRef, testId, databaseRef }
}

// General utils
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// type testing utils

export function tds(_fn: () => any) {}
export function expectType<T>(_value: T): void {}
export function expectError<T>(_value: T): void {}
export function expectAssignable<T, T2 extends T = T>(_value: T2): void {}