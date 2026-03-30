import { ref } from 'vue'
import { defineStore } from 'pinia'
import { roleApi } from '@/api/role'

export const useRoleStore = defineStore('role', () => {
  const items = ref([])
  const loading = ref(false)

  async function fetchItems(params) {
    loading.value = true
    try {
      const res = await roleApi.list(params)
      items.value = Array.isArray(res) ? res : (res.data || res.items || [])
    } catch (e) {
      console.error('Failed to fetch roles:', e)
    } finally {
      loading.value = false
    }
  }

  async function addItem(data) {
    const res = await roleApi.create(data)
    await fetchItems()
    return res
  }

  async function updateItem(id, data) {
    const res = await roleApi.update(id, data)
    await fetchItems()
    return res
  }

  async function deleteItem(id) {
    await roleApi.remove(id)
    await fetchItems()
  }

  return { items, loading, fetchItems, addItem, updateItem, deleteItem }
})
