import { ref } from 'vue'
import { defineStore } from 'pinia'
import { deviceApi } from '@/api/device'

export const useDeviceStore = defineStore('device', () => {
  const items = ref([])
  const loading = ref(false)

  async function fetchItems(params) {
    loading.value = true
    try {
      const res = await deviceApi.list(params)
      items.value = Array.isArray(res) ? res : (res.data || res.items || [])
    } catch (e) {
      console.error('Failed to fetch devices:', e)
    } finally {
      loading.value = false
    }
  }

  async function addItem(data) {
    const res = await deviceApi.create(data)
    await fetchItems()
    return res
  }

  async function updateItem(id, data) {
    const res = await deviceApi.update(id, data)
    await fetchItems()
    return res
  }

  async function deleteItem(id) {
    await deviceApi.remove(id)
    await fetchItems()
  }

  return { items, loading, fetchItems, addItem, updateItem, deleteItem }
})
