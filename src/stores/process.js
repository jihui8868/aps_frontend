import { ref } from 'vue'
import { defineStore } from 'pinia'
import { processApi } from '@/api/process'

export const useProcessStore = defineStore('process', () => {
  const items = ref([])
  const loading = ref(false)

  async function fetchItems(params) {
    loading.value = true
    try {
      const res = await processApi.list(params)
      items.value = Array.isArray(res) ? res : (res.data || res.items || [])
    } catch (e) {
      console.error('Failed to fetch processes:', e)
    } finally {
      loading.value = false
    }
  }

  async function addItem(data) {
    const res = await processApi.create(data)
    await fetchItems()
    return res
  }

  async function updateItem(id, data) {
    const res = await processApi.update(id, data)
    await fetchItems()
    return res
  }

  async function deleteItem(id) {
    await processApi.remove(id)
    await fetchItems()
  }

  return { items, loading, fetchItems, addItem, updateItem, deleteItem }
})
