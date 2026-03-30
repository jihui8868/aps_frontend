import { ref } from 'vue'
import { defineStore } from 'pinia'
import { deptApi } from '@/api/dept'

export const useDeptStore = defineStore('dept', () => {
  const items = ref([])
  const loading = ref(false)

  async function fetchItems(params) {
    loading.value = true
    try {
      const res = await deptApi.list(params)
      items.value = Array.isArray(res) ? res : (res.data || res.items || [])
    } catch (e) {
      console.error('Failed to fetch departments:', e)
    } finally {
      loading.value = false
    }
  }

  async function addItem(data) {
    const res = await deptApi.create(data)
    await fetchItems()
    return res
  }

  async function updateItem(id, data) {
    const res = await deptApi.update(id, data)
    await fetchItems()
    return res
  }

  async function deleteItem(id) {
    await deptApi.remove(id)
    await fetchItems()
  }

  return { items, loading, fetchItems, addItem, updateItem, deleteItem }
})
