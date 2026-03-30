import { ref } from 'vue'
import { defineStore } from 'pinia'
import { userApi } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const items = ref([])
  const loading = ref(false)

  async function fetchItems(params) {
    loading.value = true
    try {
      const res = await userApi.list(params)
      items.value = Array.isArray(res) ? res : (res.data || res.items || [])
    } catch (e) {
      console.error('Failed to fetch users:', e)
    } finally {
      loading.value = false
    }
  }

  async function addItem(data) {
    const res = await userApi.create(data)
    await fetchItems()
    return res
  }

  async function updateItem(id, data) {
    const res = await userApi.update(id, data)
    await fetchItems()
    return res
  }

  async function deleteItem(id) {
    await userApi.remove(id)
    await fetchItems()
  }

  async function resetPassword(id) {
    return await userApi.resetPassword(id)
  }

  async function toggleStatus(id) {
    await userApi.toggleStatus(id)
    await fetchItems()
  }

  return { items, loading, fetchItems, addItem, updateItem, deleteItem, resetPassword, toggleStatus }
})
