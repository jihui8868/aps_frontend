import { ref } from 'vue'
import { defineStore } from 'pinia'
import { productApi } from '@/api/product'

export const useProductStore = defineStore('product', () => {
  const items = ref([])
  const loading = ref(false)

  async function fetchItems(params) {
    loading.value = true
    try {
      const res = await productApi.list(params)
      items.value = Array.isArray(res) ? res : (res.data || res.items || [])
    } catch (e) {
      console.error('Failed to fetch products:', e)
    } finally {
      loading.value = false
    }
  }

  async function addItem(data) {
    const res = await productApi.create(data)
    await fetchItems()
    return res
  }

  async function updateItem(id, data) {
    const res = await productApi.update(id, data)
    await fetchItems()
    return res
  }

  async function deleteItem(id) {
    await productApi.remove(id)
    await fetchItems()
  }

  return { items, loading, fetchItems, addItem, updateItem, deleteItem }
})
