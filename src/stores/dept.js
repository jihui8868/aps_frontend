import { ref } from 'vue'
import { defineStore } from 'pinia'
import { deptApi } from '@/api/dept'

export const useDeptStore = defineStore('dept', () => {
  const items = ref([])
  const loading = ref(false)

  function flattenTree(nodes) {
    const result = []
    for (const node of nodes) {
      const { children, ...rest } = node
      result.push(rest)
      if (children?.length) {
        result.push(...flattenTree(children))
      }
    }
    return result
  }

  async function fetchItems(params) {
    loading.value = true
    try {
      const res = await deptApi.list(params)
      const data = Array.isArray(res) ? res : (res.data || res.items || [])
      items.value = data.length && data[0].children ? flattenTree(data) : data
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
