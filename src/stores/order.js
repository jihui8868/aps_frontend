import { ref } from 'vue'
import { defineStore } from 'pinia'
import { orderApi } from '@/api/order'

export const useOrderStore = defineStore('order', () => {
  const items = ref([])
  const loading = ref(false)

  async function fetchItems(params) {
    loading.value = true
    try {
      const res = await orderApi.list(params)
      items.value = Array.isArray(res) ? res : (res.data || res.items || [])
    } catch (e) {
      console.error('Failed to fetch orders:', e)
    } finally {
      loading.value = false
    }
  }

  async function addItem(data) {
    const res = await orderApi.create(data)
    await fetchItems()
    return res
  }

  async function updateItem(id, data) {
    const res = await orderApi.update(id, data)
    await fetchItems()
    return res
  }

  async function deleteItem(id) {
    await orderApi.remove(id)
    await fetchItems()
  }

  return { items, loading, fetchItems, addItem, updateItem, deleteItem }
})
