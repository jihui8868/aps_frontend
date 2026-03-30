import { ref } from 'vue'
import { defineStore } from 'pinia'
import { dictApi } from '@/api/dict'

export const useDictStore = defineStore('dict', () => {
  const categories = ref([])
  const items = ref([])
  const loading = ref(false)

  async function fetchCategories(params) {
    loading.value = true
    try {
      const res = await dictApi.listCategories(params)
      categories.value = Array.isArray(res) ? res : []
    } catch (e) {
      console.error('Failed to fetch dict categories:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchItems(category, params) {
    loading.value = true
    try {
      const res = await dictApi.listItems({ category, ...params })
      items.value = Array.isArray(res) ? res : []
    } catch (e) {
      console.error('Failed to fetch dict items:', e)
    } finally {
      loading.value = false
    }
  }

  async function addItem(data) {
    const res = await dictApi.createItem(data)
    await fetchItems(data.category)
    await fetchCategories()
    return res
  }

  async function updateItem(itemId, data) {
    const res = await dictApi.updateItem(itemId, data)
    if (data.category) await fetchItems(data.category)
    return res
  }

  async function deleteItem(itemId, category) {
    await dictApi.removeItem(itemId)
    await fetchItems(category)
    await fetchCategories()
  }

  async function toggleItemStatus(itemId, status, category) {
    await dictApi.updateItemStatus(itemId, { status })
    await fetchItems(category)
  }

  return { categories, items, loading, fetchCategories, fetchItems, addItem, updateItem, deleteItem, toggleItemStatus }
})
