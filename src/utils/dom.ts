// 阻止默认事件
export function preventDefaultEvents(e: Event) {
  e.stopPropagation && e.stopPropagation()
  e.preventDefault && e.preventDefault()
  return false
}
