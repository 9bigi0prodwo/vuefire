import Vuefire from '../src'
import {
  db,
  tick,
  delay,
  Vue
} from './helpers'

Vue.use(Vuefire)

let collection, document, vm
beforeEach(async () => {
  collection = db.collection()
  document = db.collection().doc()
  vm = new Vue({
    render (h) {
      return h('ul', this.items && this.items.map(
        item => h('li', [item])
      ))
    },
    // purposely set items as null
    // but it's a good practice to set it to an empty array
    data: () => ({
      items: null,
      item: null
    })
  })
  await tick()
})

test('manually binds a collection', async () => {
  expect(vm.items).toEqual(null)
  await vm.$bind('items', collection)
  expect(vm.items).toEqual([])
  await collection.add({ text: 'foo' })
  expect(vm.items).toEqual([{ text: 'foo' }])
})

test('manually binds a document', async () => {
  expect(vm.item).toEqual(null)
  await vm.$bind('item', document)
  expect(vm.item).toEqual(null)
  await document.update({ text: 'foo' })
  expect(vm.item).toEqual({ text: 'foo' })
})

test('returs a promise', () => {
  expect(vm.$bind('items', collection) instanceof Promise).toBe(true)
  expect(vm.$bind('item', document) instanceof Promise).toBe(true)
})

test('rejects the promise when errors', async () => {
  const fakeOnSnapshot = (_, fail) => {
    fail(new Error('nope'))
  }
  document.onSnapshot = jest.fn(fakeOnSnapshot)
  collection.onSnapshot = jest.fn(fakeOnSnapshot)
  await expect(vm.$bind('items', collection)).rejects.toThrow()
  await expect(vm.$bind('item', document)).rejects.toThrow()
  document.onSnapshot.mockRestore()
  collection.onSnapshot.mockRestore()
})

test('unbinds previously bound refs', async () => {
  await document.update({ foo: 'foo' })
  const doc2 = db.collection().doc()
  await doc2.update({ bar: 'bar' })
  await vm.$bind('item', document)
  expect(vm.$firestoreRefs.item).toBe(document)
  expect(vm.item).toEqual({ foo: 'foo' })
  await vm.$bind('item', doc2)
  expect(vm.item).toEqual({ bar: 'bar' })
  await document.update({ foo: 'baz' })
  expect(vm.$firestoreRefs.item).toBe(doc2)
  expect(vm.item).toEqual({ bar: 'bar' })
})

test('binds refs on documents', async () => {
  // create an empty doc and update using the ref instead of plain data
  const a = collection.doc()
  a.update({ foo: 'foo' })
  await document.update({ ref: a })
  await vm.$bind('item', document)

  // XXX dirty hack until $bind resolves when all refs are bound
  // NOTE should add option for it waitForRefs: true (by default)
  await delay(5)

  expect(vm.item).toEqual({
    ref: { foo: 'foo' }
  })
})