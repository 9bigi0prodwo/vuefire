import { initializeApp } from 'firebase/app'
import {
  connectDatabaseEmulator,
  getDatabase,
  ref as _databaseRef,
  query as databaseQuery,
  orderByChild,
  remove as databaseRemove,
  set as databaseSet,
  update as databaseUpdate,
  push as databasePush,
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
  DocumentReference,
  DocumentData,
  addDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  connectStorageEmulator,
  getStorage,
  ref as storageRef,
  StorageReference,
  deleteObject,
  listAll,
} from 'firebase/storage'
import { afterAll, beforeAll } from 'vitest'
import { nextTick } from 'vue'
import { isCollectionRef, isDocumentRef } from '../src/shared'

export const firebaseApp = initializeApp({
  projectId: 'vue-fire-store',
  storageBucket: 'vue-fire-store.appspot.com',
})
export const firestore = getFirestore(firebaseApp)
export const database = getDatabase(firebaseApp)
export const storage = getStorage(firebaseApp)

const HOST = '127.0.0.1'
connectFirestoreEmulator(firestore, HOST, 8080)
connectDatabaseEmulator(database, HOST, 8081)
connectStorageEmulator(storage, HOST, 9199)

let _id = 0
// wait this ms time after each operation to avoid race conditions
const SLEEP_TIME = 30

// Storage
export function setupStorageRefs() {
  const bucket = `tests/${Date.now()}-${_id++}/`
  function _storageRef(
    storageRefOrPath?: string | StorageReference,
    path?: string
  ): StorageReference {
    const _storage =
      (typeof storageRefOrPath === 'string' ? storage : storageRefOrPath) ||
      storage
    const _path =
      (typeof storageRefOrPath === 'string' ? storageRefOrPath : path) ||
      `tests/${_id++}.jpg`
    return storageRef(_storage, bucket + _path)
  }

  afterAll(async () => {
    const list = await listAll(storageRef(storage, bucket))
    await Promise.all(list.items.map((item) => deleteObject(item)))
  })

  return { storageRef: _storageRef }
}

// Firestore
// TODO: use the id in all tests to try if it makes them more stable
export function setupFirestoreRefs(id?: string) {
  const testId = _id++
  const testsCollection = collection(firestore, `__tests`)
  const itemRef = doc(testsCollection)
  // let firestore generate the id
  const forCollectionRefs = doc(testsCollection)
  const forDocRefs = collection(forCollectionRefs, 'docs')

  const listRef = collection(forCollectionRefs, 'list')
  const orderedListRef = firestoreQuery(listRef, orderBy('name'))

  afterAll(async () => {
    // cleaning up creates unexpected errors and is only necessary during dev
    if (process.env.CI) {
      return
    }
    // clean up the tests data
    await Promise.all([
      deleteDoc(itemRef),
      ...[...docsToClean].map((doc) => deleteDoc(doc)),
    ])

    await Promise.all(
      [...collectionsToClean].map((collection) => clearCollection(collection))
    )

    await clearCollection(forDocRefs)
    // must be done after the cleanup of its docs
    await deleteDoc(forCollectionRefs)
    await Promise.all([
      clearCollection(listRef),
      clearCollection(testsCollection),
    ])
  })

  // for automatically generated collections
  let collectionId = 0
  const collectionsToClean = new Set<CollectionReference<any>>()
  function _collection<T = DocumentData>(
    path?: string,
    ...pathSegments: string[]
  ) {
    path = path || `col_${collectionId++}`

    const col = collection(forCollectionRefs, path, ...pathSegments)
    collectionsToClean.add(col)
    // to avoid having to pass a converter for types
    return col as CollectionReference<T>
  }

  // for automatically generated documents
  let docId = 0
  const docsToClean = new Set<DocumentReference<any>>()
  function _doc<T = unknown>(path?: string, ...pathSegments: string[]) {
    path = path || `doc_${docId++}`
    const d = doc(forDocRefs, path, ...pathSegments)
    docsToClean.add(d)
    // to avoid having to pass a converter for types
    return d as DocumentReference<T>
  }

  // waiting a tick should ensure the data is up to date

  async function _addDoc(...args: Parameters<typeof addDoc>) {
    const d = await addDoc(...args)
    await sleep(SLEEP_TIME)
    await nextTick()
    return d
  }

  const _setDoc: typeof setDoc = async (...args: any[]) => {
    // @ts-expect-error: not a tuple
    const d = await setDoc(...args)
    await sleep(SLEEP_TIME)
    await nextTick()
    return d
  }

  async function _deleteDoc(...args: Parameters<typeof deleteDoc>) {
    const d = await deleteDoc(...args)
    await sleep(SLEEP_TIME)
    await nextTick()
    return d
  }

  const _updateDoc: typeof updateDoc = async (...args: any[]) => {
    // @ts-expect-error: not a tuple
    const d = await updateDoc(...args)
    await sleep(SLEEP_TIME)
    await nextTick()
    return d
  }

  return {
    itemRef,
    listRef,
    orderedListRef,
    testId,
    col: forCollectionRefs,
    collection: _collection,
    doc: _doc,
    query: firestoreQuery,
    addDoc: _addDoc,
    setDoc: _setDoc,
    updateDoc: _updateDoc,
    deleteDoc: _deleteDoc,
  }
}

async function clearCollection(collection: CollectionReference<any>) {
  const { docs } = await getDocsFromServer(collection)
  await Promise.all(
    docs
      .filter((doc) => doc && typeof doc.data === 'function')
      .map((doc) => {
        return recursiveDeleteDoc(doc)
      })
  )
}

async function recursiveDeleteDoc(doc: QueryDocumentSnapshot<any>) {
  const docData = doc.data()
  const promises: Promise<any>[] = []
  if (docData) {
    for (const key in docData) {
      if (isCollectionRef(docData[key])) {
        promises.push(clearCollection(docData[key]))
      } else if (
        isDocumentRef(docData[key]) &&
        typeof docData[key] === 'function'
      ) {
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
  const testsCollection = _databaseRef(database, `__tests/${testId}`)

  const itemRef = _databaseRef(database, testsCollection.key + `/item`)
  const listRef = _databaseRef(database, testsCollection.key + `/items`)
  const orderedListRef = databaseQuery(listRef, orderByChild('name'))

  beforeAll(async () => {
    // clean up the tests data
    await databaseRemove(testsCollection)
  })

  function databaseRef(path?: string) {
    const data = databasePush(testsCollection, path)
    return data.ref
  }

  const _set: typeof databaseSet = async (ref, options) => {
    const d = await databaseSet(ref, options)
    sleep(SLEEP_TIME)
    await nextTick()
    return d
  }

  const _update: typeof databaseUpdate = async (ref, options) => {
    const d = await databaseUpdate(ref, options)
    sleep(SLEEP_TIME)
    await nextTick()
    return d
  }

  const _remove: typeof databaseRemove = async (ref) => {
    const d = await databaseRemove(ref)
    sleep(SLEEP_TIME)
    await nextTick()
    return d
  }

  // @ts-expect-error: it complains about thenable vs promise...
  const _push: typeof databasePush = async (...args: any[]) => {
    // @ts-expect-error: not a tuple
    const d = await databasePush(...args)
    sleep(SLEEP_TIME)
    await nextTick()
    return d
  }

  return {
    itemRef,
    listRef,
    orderedListRef,
    testId,
    databaseRef,
    set: _set,
    update: _update,
    remove: _remove,
    push: _push,
  }
}

// General utils
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// type testing utils

export function tds(_fn: () => any) {}
export function expectType<T>(_value: T): void {}
export function expectError<T>(_value: T): void {}
export function expectAssignable<T, T2 extends T = T>(_value: T2): void {}
