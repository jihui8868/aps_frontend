import { ref } from 'vue'
import { defineStore } from 'pinia'
import { scheduleApi } from '@/api/schedule'

export const useScheduleStore = defineStore('schedule', () => {
  const items = ref([])
  const loading = ref(false)
  const current = ref(null)

  async function fetchItems(params) {
    loading.value = true
    try {
      const res = await scheduleApi.list(params)
      items.value = Array.isArray(res) ? res : (res.data || res.items || [])
    } catch (e) {
      console.error('Failed to fetch schedules:', e)
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    const res = await scheduleApi.getById(id)
    current.value = res
    return res
  }

  async function addItem(data) {
    const res = await scheduleApi.create(data)
    await fetchItems()
    return res
  }

  async function deleteItem(id) {
    await scheduleApi.remove(id)
    await fetchItems()
  }

  async function clearAll() {
    await scheduleApi.clearAll()
    items.value = []
    current.value = null
  }

  return { items, loading, current, fetchItems, getById, addItem, deleteItem, clearAll }
})
